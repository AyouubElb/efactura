import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
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
import { type Client, Prisma } from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import { changes } from '../activity/changes.js';
import { SettingsService } from '../settings/settings.service.js';
import type {
  ClientDto,
  CreateClientDto,
  UpdateClientDto,
} from './dto/clients.dto.js';

type EditableFields = Pick<
  Client,
  | 'type'
  | 'name'
  | 'ice'
  | 'address'
  | 'city'
  | 'email'
  | 'phone'
  | 'paymentDays'
>;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly settings: SettingsService,
  ) {}

  async list({
    page,
    pageSize,
    search,
    archived,
  }: ListQueryDto): Promise<Page<ClientDto>> {
    const { ids, total } = await pageOfIds(
      this.prisma,
      Prisma.sql`FROM clients
        WHERE (archived_at IS NOT NULL) = ${archived}
          ${search ? Prisma.sql`AND ${matchesNameOrIce(search)}` : Prisma.empty}`,
      search
        ? Prisma.sql`word_similarity(${searchText(search)}, ${NAME}) DESC, ${BY_NAME}`
        : BY_NAME,
      page,
      pageSize,
    );
    const rows = await this.prisma.client.findMany({
      where: { id: { in: ids } },
    });
    return new Page(inOrder(ids, rows).map(toDto), page, pageSize, total);
  }

  async get(id: string): Promise<ClientDto> {
    return toDto(await this.prisma.client.findUniqueOrThrow({ where: { id } }));
  }

  async create(dto: CreateClientDto, user: AuthUser): Promise<ClientDto> {
    const data = checked({
      type: dto.type,
      name: dto.name,
      ice: dto.ice ?? null,
      address: dto.address ?? null,
      city: dto.city ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      paymentDays: dto.paymentDays ?? (await this.defaultPaymentDays()),
    });
    const id = await this.saving(data.ice, () =>
      this.prisma.$transaction(async (tx) => {
        const client = await tx.client.create({ data });
        await this.activity.record(
          tx,
          user,
          'client.created',
          { type: 'client', id: client.id },
          `a créé le client ${client.name}`,
        );
        return client.id;
      }),
    );
    return this.get(id);
  }

  async update(
    id: string,
    dto: UpdateClientDto,
    user: AuthUser,
  ): Promise<ClientDto> {
    const paymentDays =
      dto.paymentDays === null
        ? await this.defaultPaymentDays()
        : dto.paymentDays;
    await this.saving(dto.ice, () =>
      this.prisma.$transaction(async (tx) => {
        await lockRow(tx, 'clients', id);
        const row = await tx.client.findUniqueOrThrow({ where: { id } });
        const before = editable(row);
        // undefined: not sent, keep; null: cleared
        const keep = <K extends keyof EditableFields>(key: K) =>
          dto[key] === undefined ? before[key] : dto[key];
        const after = checked({
          type: dto.type ?? before.type,
          name: dto.name ?? before.name,
          ice: keep('ice'),
          address: keep('address'),
          city: keep('city'),
          email: keep('email'),
          phone: keep('phone'),
          paymentDays: paymentDays ?? before.paymentDays,
        });
        const changed = changes(before, after);
        if (!changed) {
          return;
        }
        await tx.client.update({ where: { id }, data: after });
        await this.activity.record(
          tx,
          user,
          'client.updated',
          { type: 'client', id },
          `a modifié le client ${after.name}`,
          changed,
        );
      }),
    );
    return this.get(id);
  }

  archive(id: string, user: AuthUser) {
    return this.setArchived(id, true, user);
  }

  restore(id: string, user: AuthUser) {
    return this.setArchived(id, false, user);
  }

  private async setArchived(
    id: string,
    archived: boolean,
    user: AuthUser,
  ): Promise<ClientDto> {
    const current = await this.prisma.client.findUniqueOrThrow({
      where: { id },
      select: { ice: true },
    });
    await this.saving(current.ice, () =>
      this.prisma.$transaction(async (tx) => {
        await lockRow(tx, 'clients', id);
        const row = await tx.client.findUniqueOrThrow({ where: { id } });
        if ((row.archivedAt !== null) === archived) {
          return;
        }
        await tx.client.update({
          where: { id },
          data: { archivedAt: archived ? new Date() : null },
        });
        await this.activity.record(
          tx,
          user,
          archived ? 'client.archived' : 'client.restored',
          { type: 'client', id },
          `a ${archived ? 'archivé' : 'restauré'} le client ${row.name}`,
        );
      }),
    );
    return this.get(id);
  }

  // The unique index refused the ICE: name the client that holds it
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
        ? await this.prisma.client.findFirst({
            where: { archivedAt: null, ice },
            select: { name: true },
          })
        : null;
      throw new ConflictException({
        code: 'CLIENT_EXISTS',
        message: holder
          ? `Ce client existe déjà : ${holder.name}`
          : 'Ce client existe déjà',
      });
    }
  }

  private async defaultPaymentDays() {
    return (await this.settings.get()).defaultPaymentDays;
  }
}

const NAME = Prisma.sql`lower(f_unaccent(name))`;

// By name with typos, or by the start of the ICE
function matchesNameOrIce(search: string) {
  const byIce = /^\d+$/.test(search)
    ? Prisma.sql`OR ice LIKE ${`${search}%`}`
    : Prisma.empty;
  return Prisma.sql`(${allWordsMatch(search, [NAME])} ${byIce})`;
}

// A company needs its ICE; an individual never keeps one
function checked(fields: EditableFields): EditableFields {
  if (fields.type === 'individual') {
    return { ...fields, ice: null };
  }
  if (!fields.ice) {
    throw new BadRequestException({
      code: 'VALIDATION_FAILED',
      message: 'Données invalides',
      fields: { ice: "L'ICE est obligatoire pour une entreprise" },
    });
  }
  return fields;
}

function editable(row: EditableFields): EditableFields {
  return {
    type: row.type,
    name: row.name,
    ice: row.ice,
    address: row.address,
    city: row.city,
    email: row.email,
    phone: row.phone,
    paymentDays: row.paymentDays,
  };
}

function toDto(row: Client): ClientDto {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    ice: row.ice,
    address: row.address,
    city: row.city,
    email: row.email,
    phone: row.phone,
    paymentDays: row.paymentDays,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
