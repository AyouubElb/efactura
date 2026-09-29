import { computeTotals, formatMoney } from '@efactura/shared';
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
import { Prisma } from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import { changes } from '../activity/changes.js';
import { SettingsService } from '../settings/settings.service.js';
import type {
  CreateProductDto,
  ProductDto,
  UpdateProductDto,
} from './dto/products.dto.js';

const DEFAULT_UNIT = 'pièce';

const PRODUCT = {
  include: { lastSupplier: { select: { id: true, name: true } } },
} satisfies Prisma.ProductDefaultArgs;

type ProductRow = Prisma.ProductGetPayload<typeof PRODUCT>;

// What a person can edit; the cost comes only from supplier invoices
type EditableFields = Pick<
  ProductRow,
  'name' | 'reference' | 'unit' | 'priceHtCentimes' | 'tvaRateBp'
>;

@Injectable()
export class ProductsService {
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
  }: ListQueryDto): Promise<Page<ProductDto>> {
    // Same expressions as the trigram indexes, or PostgreSQL ignores them
    const name = Prisma.sql`lower(f_unaccent(name))`;
    const reference = Prisma.sql`lower(f_unaccent(coalesce(reference, '')))`;
    const text = search ? searchText(search) : null;
    const { ids, total } = await pageOfIds(
      this.prisma,
      Prisma.sql`FROM products
        WHERE (archived_at IS NOT NULL) = ${archived}
          ${search ? Prisma.sql`AND ${allWordsMatch(search, [name, reference])}` : Prisma.empty}`,
      text
        ? Prisma.sql`${reference} = ${text} DESC,
            greatest(word_similarity(${text}, ${name}),
                     word_similarity(${text}, ${reference})) DESC,
            ${BY_NAME}`
        : BY_NAME,
      page,
      pageSize,
    );
    const rows = await this.prisma.product.findMany({
      ...PRODUCT,
      where: { id: { in: ids } },
    });
    return new Page(inOrder(ids, rows).map(toDto), page, pageSize, total);
  }

  async get(id: string): Promise<ProductDto> {
    const row = await this.prisma.product.findUniqueOrThrow({
      ...PRODUCT,
      where: { id },
    });
    return toDto(row);
  }

  async create(dto: CreateProductDto, user: AuthUser): Promise<ProductDto> {
    await this.assertTvaRate(dto.tvaRateBp);
    const data = {
      name: dto.name,
      reference: dto.reference ?? null,
      unit: dto.unit ?? DEFAULT_UNIT,
      priceHtCentimes: dto.priceHtCentimes,
      tvaRateBp: dto.tvaRateBp,
    };
    const id = await this.saving(data.reference, () =>
      this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({ data });
        await this.activity.record(
          tx,
          user,
          'product.created',
          { type: 'product', id: product.id },
          `a créé le produit ${product.name}`,
        );
        return product.id;
      }),
    );
    return this.get(id);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    user: AuthUser,
  ): Promise<ProductDto> {
    await this.saving(dto.reference, () =>
      this.prisma.$transaction(async (tx) => {
        await lockRow(tx, 'products', id);
        const row = await tx.product.findUniqueOrThrow({ where: { id } });
        const before = editable(row);
        const after: EditableFields = {
          name: dto.name ?? before.name,
          reference:
            dto.reference === undefined ? before.reference : dto.reference,
          unit:
            dto.unit === undefined ? before.unit : (dto.unit ?? DEFAULT_UNIT),
          priceHtCentimes: dto.priceHtCentimes ?? before.priceHtCentimes,
          tvaRateBp: dto.tvaRateBp ?? before.tvaRateBp,
        };
        // A rate the settings dropped stays until someone changes it
        if (after.tvaRateBp !== before.tvaRateBp) {
          await this.assertTvaRate(after.tvaRateBp);
        }
        const changed = changes(before, after);
        if (!changed) {
          return;
        }
        await tx.product.update({ where: { id }, data: after });
        const price =
          before.priceHtCentimes === after.priceHtCentimes
            ? ''
            : ` (prix HT ${formatMoney(before.priceHtCentimes)} → ${formatMoney(after.priceHtCentimes)})`;
        await this.activity.record(
          tx,
          user,
          'product.updated',
          { type: 'product', id },
          `a modifié le produit ${after.name}${price}`,
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
  ): Promise<ProductDto> {
    const current = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      select: { reference: true },
    });
    await this.saving(current.reference, () =>
      this.prisma.$transaction(async (tx) => {
        await lockRow(tx, 'products', id);
        const row = await tx.product.findUniqueOrThrow({ where: { id } });
        if ((row.archivedAt !== null) === archived) {
          return;
        }
        await tx.product.update({
          where: { id },
          data: { archivedAt: archived ? new Date() : null },
        });
        await this.activity.record(
          tx,
          user,
          archived ? 'product.archived' : 'product.restored',
          { type: 'product', id },
          `a ${archived ? 'archivé' : 'restauré'} le produit ${row.name}`,
        );
      }),
    );
    return this.get(id);
  }

  // The unique index refused the reference: name the product that holds it
  private async saving<T>(
    reference: string | null | undefined,
    save: () => Promise<T>,
  ): Promise<T> {
    try {
      return await save();
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      // The index's own rule: Prisma's insensitive mode reads "_" as any character
      const [holder] = reference
        ? await this.prisma.$queryRaw<{ name: string }[]>`
            SELECT name FROM products
             WHERE archived_at IS NULL AND lower(reference) = lower(${reference})`
        : [];
      throw new ConflictException({
        code: 'REFERENCE_TAKEN',
        message: holder
          ? `Cette référence existe déjà : ${holder.name}`
          : 'Cette référence existe déjà',
      });
    }
  }

  private async assertTvaRate(rateBp: number) {
    const { tvaRatesBp } = await this.settings.get();
    if (!tvaRatesBp.includes(rateBp)) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Données invalides',
        fields: {
          tvaRateBp: 'Taux de TVA non proposé dans les paramètres',
        },
      });
    }
  }
}

function editable(row: EditableFields): EditableFields {
  return {
    name: row.name,
    reference: row.reference,
    unit: row.unit,
    priceHtCentimes: row.priceHtCentimes,
    tvaRateBp: row.tvaRateBp,
  };
}

function toDto(row: ProductRow): ProductDto {
  return {
    id: row.id,
    name: row.name,
    reference: row.reference,
    unit: row.unit,
    priceHtCentimes: row.priceHtCentimes,
    tvaRateBp: row.tvaRateBp,
    // The TTC of one unit, computed exactly as on a document line
    priceTtcCentimes: computeTotals([
      {
        quantity: '1',
        unitPriceHtCentimes: row.priceHtCentimes,
        tvaRateBp: row.tvaRateBp,
      },
    ]).totalTtcCentimes,
    lastCostHtCentimes: row.lastCostHtCentimes,
    lastCostAt: row.lastCostAt,
    lastSupplier: row.lastSupplier,
    earningHtCentimes:
      row.lastCostHtCentimes === null
        ? null
        : row.priceHtCentimes - row.lastCostHtCentimes,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
