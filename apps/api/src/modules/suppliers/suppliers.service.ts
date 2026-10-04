import { ConflictException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { lockRow } from '../../common/prisma/lock-row.js';
import {
  allWordsMatch,
  BY_NAME,
  inOrder,
  pageOfIds,
  searchText,
} from '../../common/prisma/search.js';
import { isUniqueViolation } from '../../common/prisma/unique-violation.js';
import type { ListQueryDto } from '../../common/validation/list-query.dto.js';
import { Page } from '../../common/response/page.js';
import { Prisma, type Supplier } from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import { changes } from '../activity/changes.js';
import type {
  CreateSupplierDto,
  SupplierDto,
  UpdateSupplierDto,
} from './dto/suppliers.dto.js';

type EditableFields = Pick<
  Supplier,
  'name' | 'ice' | 'ifNumber' | 'address' | 'city' | 'phone' | 'email'
>;

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list({
    page,
    pageSize,
    search,
    archived,
  }: ListQueryDto): Promise<Page<SupplierDto>> {
    const { ids, total } = await pageOfIds(
      this.prisma,
      Prisma.sql`FROM suppliers
        WHERE (archived_at IS NOT NULL) = ${archived}
          ${search ? Prisma.sql`AND ${matchesNameOrIce(search)}` : Prisma.empty}`,
      search
        ? Prisma.sql`word_similarity(${searchText(search)}, ${NAME}) DESC, ${BY_NAME}`
        : BY_NAME,
      page,
      pageSize,
    );
    const rows = await this.prisma.supplier.findMany({
      where: { id: { in: ids } },
    });
    return new Page(inOrder(ids, rows).map(toDto), page, pageSize, total);
  }

  async get(id: string): Promise<SupplierDto> {
    return toDto(
      await this.prisma.supplier.findUniqueOrThrow({ where: { id } }),
    );
  }

  async create(dto: CreateSupplierDto, user: AuthUser): Promise<SupplierDto> {
    const data: EditableFields = {
      name: dto.name,
      ice: dto.ice ?? null,
      ifNumber: dto.ifNumber ?? null,
      address: dto.address ?? null,
      city: dto.city ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
    };
    const id = await this.saving(data.ice, () =>
      this.prisma.$transaction((tx) => this.insert(tx, data, user)),
    );
    return this.get(id);
  }

  // "Valider" on a supplier invoice calls it inside its own transaction
  async insert(
    tx: Prisma.TransactionClient,
    data: EditableFields,
    user: AuthUser,
  ): Promise<string> {
    const supplier = await tx.supplier.create({ data });
    await this.activity.record(
      tx,
      user,
      'supplier.created',
      { type: 'supplier', id: supplier.id },
      `a créé le fournisseur ${supplier.name}`,
    );
    return supplier.id;
  }

  async update(
    id: string,
    dto: UpdateSupplierDto,
    user: AuthUser,
  ): Promise<SupplierDto> {
    await this.saving(dto.ice, () =>
      this.prisma.$transaction(async (tx) => {
        await lockRow(tx, 'suppliers', id);
        const row = await tx.supplier.findUniqueOrThrow({ where: { id } });
        const before = editable(row);
        // undefined: not sent, keep; null: cleared
        const keep = <K extends keyof EditableFields>(key: K) =>
          dto[key] === undefined ? before[key] : dto[key];
        const after: EditableFields = {
          name: dto.name ?? before.name,
          ice: keep('ice'),
          ifNumber: keep('ifNumber'),
          address: keep('address'),
          city: keep('city'),
          phone: keep('phone'),
          email: keep('email'),
        };
        const changed = changes(before, after);
        if (!changed) {
          return;
        }
        await tx.supplier.update({ where: { id }, data: after });
        await this.activity.record(
          tx,
          user,
          'supplier.updated',
          { type: 'supplier', id },
          `a modifié le fournisseur ${after.name}`,
          changed,
        );
      }),
    );
    return this.get(id);
  }

  archive(id: string, user: AuthUser) {
    return this.setArchived(id, true, user);
  }

  // The ICE stays unique even when archived, so a restore never conflicts
  restore(id: string, user: AuthUser) {
    return this.setArchived(id, false, user);
  }

  private async setArchived(
    id: string,
    archived: boolean,
    user: AuthUser,
  ): Promise<SupplierDto> {
    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'suppliers', id);
      const row = await tx.supplier.findUniqueOrThrow({ where: { id } });
      if ((row.archivedAt !== null) === archived) {
        return;
      }
      await tx.supplier.update({
        where: { id },
        data: { archivedAt: archived ? new Date() : null },
      });
      await this.activity.record(
        tx,
        user,
        archived ? 'supplier.archived' : 'supplier.restored',
        { type: 'supplier', id },
        `a ${archived ? 'archivé' : 'restauré'} le fournisseur ${row.name}`,
      );
    });
    return this.get(id);
  }

  // The unique index refused the ICE: name the supplier that holds it
  private async saving<T>(
    ice: string | null | undefined,
    save: () => Promise<T>,
  ): Promise<T> {
    try {
      return await save();
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const holder = ice
        ? await this.prisma.supplier.findUnique({
            where: { ice },
            select: { name: true, archivedAt: true },
          })
        : null;
      throw new ConflictException({
        code: 'SUPPLIER_EXISTS',
        message: !holder
          ? 'Ce fournisseur existe déjà'
          : holder.archivedAt
            ? `Ce fournisseur existe déjà, archivé : ${holder.name}. Restaurez-le`
            : `Ce fournisseur existe déjà : ${holder.name}`,
      });
    }
  }
}

const NAME = Prisma.sql`lower(f_unaccent(name))`;

// By name with typos, or by the start of the ICE; a few suppliers need no index
function matchesNameOrIce(search: string) {
  const byIce = /^\d+$/.test(search)
    ? Prisma.sql`OR ice LIKE ${`${search}%`}`
    : Prisma.empty;
  return Prisma.sql`(${allWordsMatch(search, [NAME])} ${byIce})`;
}

function editable(row: EditableFields): EditableFields {
  return {
    name: row.name,
    ice: row.ice,
    ifNumber: row.ifNumber,
    address: row.address,
    city: row.city,
    phone: row.phone,
    email: row.email,
  };
}

function toDto(row: Supplier): SupplierDto {
  return {
    id: row.id,
    name: row.name,
    ice: row.ice,
    ifNumber: row.ifNumber,
    address: row.address,
    city: row.city,
    phone: row.phone,
    email: row.email,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
  };
}
