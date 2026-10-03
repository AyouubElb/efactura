import {
  addDays,
  formatDate,
  formatMoney,
  htFromTtcCentimes,
  isValidIceFormat,
  LINE_QUANTITY_PATTERN,
  MAX_CENTIMES,
  todayInMorocco,
} from '@efactura/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { lockRow } from '../../common/prisma/lock-row.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { isUniqueViolation } from '../../common/prisma/unique-violation.js';
import { Prisma, type Product } from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import { isDay, json } from '../documents/drafts.js';
import { dayToDate } from '../documents/numbers.js';
import { MAX_PRICE_CENTIMES } from '../products/dto/products.dto.js';
import { ProductsService } from '../products/products.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { SuppliersService } from '../suppliers/suppliers.service.js';
import type { DraftLine, PurchaseDraft } from './draft.js';
import { notEditable } from './editable.js';
import { labelKey } from './matching.service.js';

const DEFAULT_UNIT = 'pièce';

type Problems = Record<string, string>;

interface KeptLine {
  line: DraftLine;
  // Its place in the brouillon, so a message points at the line the person sees
  index: number;
}

interface CostChange {
  productId: string;
  beforeCentimes: number | null;
  afterCentimes: number | null;
}

@Injectable()
export class ConfirmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly settings: SettingsService,
    private readonly suppliers: SuppliersService,
    private readonly products: ProductsService,
  ) {}

  // "Valider": the supplier, new products, lines, costs and saved names, all or nothing
  async confirm(id: string, user: AuthUser): Promise<void> {
    const { tvaRatesBp } = await this.settings.get();
    try {
      await this.prisma.$transaction(async (tx) => {
        await lockRow(tx, 'purchase_invoices', id);
        const purchase = await tx.purchaseInvoice.findUniqueOrThrow({ where: { id } });
        if (purchase.status !== 'ready') {
          throw notEditable(purchase.status);
        }
        const draft = purchase.reviewDraft as unknown as PurchaseDraft;
        const found = problems(draft, tvaRatesBp, todayInMorocco());
        if (Object.keys(found).length > 0) {
          throw incomplete(found);
        }

        // Every value below was checked above
        const number = draft.invoiceNumber?.trim() ?? '';
        const day = draft.invoiceDate ?? '';
        const year = Number(day.slice(0, 4));
        const supplier = await this.supplierFor(tx, draft, number, user);
        await assertNewNumber(tx, supplier, number, year);

        const kept = draft.lines.flatMap((line, index) => (line.ignored ? [] : [{ line, index }]));
        const chosen = await chosenProducts(tx, kept);
        await assertFreeReferences(tx, kept);
        const productOf = new Map<number, string>();
        for (const { line, index } of kept) {
          if (line.match === 'new_product') {
            productOf.set(index, await this.newProduct(tx, line, user));
          } else {
            productOf.set(index, line.productId ?? '');
          }
        }

        // Prices printed with tax are saved before tax, like every cost
        const ht = (centimes: number | null, rateBp: number | null) =>
          draft.pricesIncludeTax ? htFromTtcCentimes(centimes ?? 0, rateBp ?? 0) : (centimes ?? 0);
        const lines = kept.map(({ line, index }, position) => {
          const productId = productOf.get(index) ?? '';
          return {
            purchaseId: id,
            position: position + 1,
            labelRaw: line.label?.trim() ?? '',
            productId,
            matchMethod: line.match ?? 'manual',
            quantity: line.quantity ?? '',
            unitCostHtCentimes: ht(line.unitPriceCentimes, line.tvaRateBp),
            lineTotalHtCentimes: ht(line.lineTotalCentimes, line.tvaRateBp),
            tvaRateBp: line.tvaRateBp ?? 0,
            previousCostHtCentimes: chosen.get(productId)?.lastCostHtCentimes ?? null,
          };
        });
        await tx.purchaseLine.createMany({ data: lines });

        const costs = await updateCosts(tx, lines, chosen, supplier.id, day);
        for (const { line, index } of kept) {
          await saveName(tx, supplier.id, line.label ?? '', productOf.get(index) ?? '');
        }

        await tx.purchaseInvoice.update({
          where: { id },
          data: {
            status: 'confirmed',
            supplierId: supplier.id,
            supplierInvoiceNumber: number,
            invoiceDate: dayToDate(day),
            invoiceYear: year,
            totalHtCentimes: draft.totals.htCentimes,
            totalTvaCentimes: draft.totals.tvaCentimes,
            totalTtcCentimes: draft.totals.ttcCentimes,
            confirmedById: user.id,
            confirmedAt: new Date(),
          },
        });
        const count = lines.length;
        await this.activity.record(
          tx,
          user,
          'purchase.confirmed',
          { type: 'purchase_invoice', id },
          `a validé la facture fournisseur ${number} de ${supplier.name} : ${count} ligne${count > 1 ? 's' : ''}, ${formatMoney(draft.totals.ttcCentimes ?? 0)} DH TTC`,
          json({
            supplierId: supplier.id,
            newProducts: kept.filter(({ line }) => line.match === 'new_product').map(({ index }) => productOf.get(index)),
            ignoredLines: draft.lines.length - count,
            costs,
          }),
        );
      });
    } catch (error) {
      // Another "Valider" took the same number or reference between our checks and our writes
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          code: 'CONFIRM_CONFLICT',
          message: 'Ces données viennent de changer : rechargez la page et validez à nouveau',
        });
      }
      throw error;
    }
  }

  // The chosen supplier, the one with this ICE, or a new one; an archived one comes back
  private async supplierFor(
    tx: Prisma.TransactionClient,
    draft: PurchaseDraft,
    number: string,
    user: AuthUser,
  ): Promise<{ id: string; name: string }> {
    const ice = withoutSpaces(draft.supplier.ice);
    const existing = draft.supplier.id
      ? await tx.supplier.findUnique({ where: { id: draft.supplier.id } })
      : ice
        ? await tx.supplier.findUnique({ where: { ice } })
        : null;
    if (draft.supplier.id && !existing) {
      throw incomplete({ 'supplier.id': 'Fournisseur introuvable' });
    }
    if (!existing) {
      const name = draft.supplier.name?.trim() ?? '';
      const id = await this.suppliers.insert(
        tx,
        {
          name,
          ice,
          ifNumber: withoutSpaces(draft.supplier.ifNumber),
          address: draft.supplier.address?.trim() || null,
          city: null,
          phone: null,
          email: null,
        },
        user,
      );
      return { id, name };
    }
    if (existing.archivedAt) {
      await tx.supplier.update({ where: { id: existing.id }, data: { archivedAt: null } });
      await this.activity.record(
        tx,
        user,
        'supplier.restored',
        { type: 'supplier', id: existing.id },
        `a restauré le fournisseur ${existing.name} pour sa facture ${number}`,
      );
    }
    return { id: existing.id, name: existing.name };
  }

  // "Créer le produit": its cost comes with the other lines
  private newProduct(tx: Prisma.TransactionClient, line: DraftLine, user: AuthUser) {
    const product = line.newProduct;
    return this.products.insert(
      tx,
      {
        name: product?.name?.trim() ?? '',
        reference: product?.reference?.trim() || null,
        unit: product?.unit?.trim() || DEFAULT_UNIT,
        priceHtCentimes: product?.priceHtCentimes ?? 0,
        tvaRateBp: product?.tvaRateBp ?? 0,
      },
      user,
    );
  }
}

// Every rule a purchase must meet, by field: the screen shows each message next to its field
function problems(draft: PurchaseDraft, tvaRatesBp: number[], today: string): Problems {
  const found: Problems = {};
  if (draft.documentType !== 'invoice') {
    found.documentType = "Ce document n'est pas une facture : corrigez son type ou écartez-le";
  }
  if (!draft.supplier.id) {
    if (!draft.supplier.name?.trim()) {
      found['supplier.name'] = 'Nom du fournisseur requis';
    }
    const ice = withoutSpaces(draft.supplier.ice);
    if (ice && !isValidIceFormat(ice)) {
      found['supplier.ice'] = "L'ICE compte 15 chiffres";
    }
  }
  if (!draft.invoiceNumber?.trim()) {
    found.invoiceNumber = 'Numéro de facture requis';
  }
  if (!draft.invoiceDate || !isDay(draft.invoiceDate)) {
    found.invoiceDate = 'Date invalide : AAAA-MM-JJ';
  } else if (draft.invoiceDate > today) {
    found.invoiceDate = 'Date dans le futur';
  }
  for (const key of ['htCentimes', 'tvaCentimes', 'ttcCentimes'] as const) {
    const problem = amountProblem(draft.totals[key], MAX_CENTIMES, 'Montant négatif');
    if (problem) {
      found[`totals.${key}`] = problem;
    }
  }
  if (draft.lines.every((line) => line.ignored)) {
    found.lines = 'Au moins une ligne à enregistrer';
  }
  draft.lines.forEach((line, index) => {
    if (!line.ignored) {
      Object.assign(found, lineProblems(line, `lines.${index}`, tvaRatesBp));
    }
  });
  return found;
}

function lineProblems(line: DraftLine, at: string, tvaRatesBp: number[]): Problems {
  const found: Problems = {};
  const discount = "Montant négatif : ignorez la ligne s'il s'agit d'une remise";
  if (!line.label?.trim()) {
    found[`${at}.label`] = 'Libellé requis';
  }
  if (!line.quantity || !LINE_QUANTITY_PATTERN.test(line.quantity)) {
    found[`${at}.quantity`] = 'Quantité invalide : 10 ou 2.5, au-dessus de 0';
  }
  const price = amountProblem(line.unitPriceCentimes, MAX_PRICE_CENTIMES, discount);
  if (price) {
    found[`${at}.unitPriceCentimes`] = price;
  }
  const total = amountProblem(line.lineTotalCentimes, MAX_CENTIMES, discount);
  if (total) {
    found[`${at}.lineTotalCentimes`] = total;
  }
  if (line.tvaRateBp === null || line.tvaRateBp === undefined) {
    found[`${at}.tvaRateBp`] = 'Taux de TVA requis';
  }
  if (line.match !== 'new_product') {
    if (!line.productId) {
      found[`${at}.productId`] = 'Choisissez un produit, créez-le ou ignorez la ligne';
    }
    return found;
  }
  const product = line.newProduct;
  if (!product) {
    found[`${at}.newProduct`] = 'Décrivez le nouveau produit';
    return found;
  }
  const name = product.name?.trim() ?? '';
  if (!name || name.length > 200) {
    found[`${at}.newProduct.name`] = name ? 'Texte trop long' : 'Nom du produit requis';
  }
  if ((product.reference?.trim().length ?? 0) > 50) {
    found[`${at}.newProduct.reference`] = 'Texte trop long';
  }
  if ((product.unit?.trim().length ?? 0) > 20) {
    found[`${at}.newProduct.unit`] = 'Texte trop long';
  }
  const selling = amountProblem(product.priceHtCentimes, MAX_PRICE_CENTIMES, 'Montant négatif');
  if (selling) {
    found[`${at}.newProduct.priceHtCentimes`] = selling === 'Montant requis' ? 'Prix de vente requis' : selling;
  }
  if (product.tvaRateBp === null) {
    found[`${at}.newProduct.tvaRateBp`] = 'Taux de TVA requis';
  } else if (!tvaRatesBp.includes(product.tvaRateBp)) {
    found[`${at}.newProduct.tvaRateBp`] = 'Taux de TVA non proposé dans les paramètres';
  }
  return found;
}

function amountProblem(value: number | null | undefined, max: number, negative: string) {
  if (value === null || value === undefined) {
    return 'Montant requis';
  }
  if (value < 0) {
    return negative;
  }
  return value > max ? 'Valeur trop grande' : undefined;
}

// Same answer shape as the validation pipe, so the screen marks each field
function incomplete(fields: Problems): BadRequestException {
  return new BadRequestException({
    code: 'DRAFT_INCOMPLETE',
    message: 'Achat incomplet : corrigez les champs signalés',
    fields,
  });
}

// A supplier's number is validated once a year: the photo and the PDF of one invoice
async function assertNewNumber(
  tx: Prisma.TransactionClient,
  supplier: { id: string; name: string },
  number: string,
  year: number,
) {
  const earlier = await tx.purchaseInvoice.findFirst({
    where: { status: 'confirmed', supplierId: supplier.id, supplierInvoiceNumber: number, invoiceYear: year },
    select: { confirmedAt: true },
  });
  if (earlier) {
    throw new ConflictException({
      code: 'NUMBER_CONFIRMED',
      message: `Facture ${number} de ${supplier.name} déjà validée le ${formatDate(todayInMorocco(earlier.confirmedAt ?? new Date()))}`,
      fields: { invoiceNumber: 'Facture déjà validée' },
    });
  }
}

// The catalogue products the lines point at, as they were before this purchase
async function chosenProducts(tx: Prisma.TransactionClient, kept: KeptLine[]) {
  const ids = [
    ...new Set(kept.flatMap(({ line }) => (line.match !== 'new_product' && line.productId ? [line.productId] : []))),
  ];
  const rows = await tx.product.findMany({ where: { id: { in: ids } } });
  const products = new Map<string, Product>(rows.map((row) => [row.id, row]));
  const found: Problems = {};
  for (const { line, index } of kept) {
    if (line.match === 'new_product' || !line.productId) {
      continue;
    }
    const product = products.get(line.productId);
    if (!product) {
      found[`lines.${index}.productId`] = 'Produit introuvable';
    } else if (product.archivedAt) {
      found[`lines.${index}.productId`] = `Produit archivé : ${product.name}. Choisissez-en un autre ou restaurez-le`;
    }
  }
  if (Object.keys(found).length > 0) {
    throw incomplete(found);
  }
  return products;
}

// One active product per reference, case ignored: the new ones too
async function assertFreeReferences(tx: Prisma.TransactionClient, kept: KeptLine[]) {
  const references = kept.flatMap(({ line, index }) => {
    const reference = line.match === 'new_product' ? line.newProduct?.reference?.trim() : undefined;
    return reference ? [{ reference, index }] : [];
  });
  const taken = (index: number, message: string) =>
    new ConflictException({
      code: 'REFERENCE_TAKEN',
      message: `Ligne ${index + 1} : ${message}`,
      fields: { [`lines.${index}.newProduct.reference`]: message },
    });
  const seen = new Map<string, number>();
  for (const { reference, index } of references) {
    const first = seen.get(reference.toLowerCase());
    if (first !== undefined) {
      throw taken(index, `même référence que la ligne ${first + 1}`);
    }
    seen.set(reference.toLowerCase(), index);
  }
  if (references.length === 0) {
    return;
  }
  const holders = await tx.$queryRaw<{ name: string; reference: string }[]>`
    SELECT name, lower(reference) AS reference FROM products
    WHERE archived_at IS NULL
      AND lower(reference) IN (${Prisma.join(references.map(({ reference }) => reference.toLowerCase()))})`;
  for (const holder of holders) {
    const line = references.find(({ reference }) => reference.toLowerCase() === holder.reference);
    if (line) {
      throw taken(line.index, `cette référence existe déjà : ${holder.name}`);
    }
  }
}

// The newest invoice date wins: an older invoice is saved but leaves the cost as it is
async function updateCosts(
  tx: Prisma.TransactionClient,
  lines: { productId: string; unitCostHtCentimes: number }[],
  before: Map<string, Product>,
  supplierId: string,
  day: string,
): Promise<CostChange[]> {
  // The same product twice on one invoice: its last line gives the cost
  const latest = new Map(lines.map((line) => [line.productId, line.unitCostHtCentimes]));
  const changes: CostChange[] = [];
  for (const [productId, cost] of latest) {
    const { count } = await tx.product.updateMany({
      where: {
        id: productId,
        // A cost saved later the same day still counts as that day
        OR: [{ lastCostAt: null }, { lastCostAt: { lt: dayToDate(addDays(day, 1)) } }],
      },
      data: { lastCostHtCentimes: cost, lastCostAt: dayToDate(day), lastSupplierId: supplierId },
    });
    const previous = before.get(productId)?.lastCostHtCentimes ?? null;
    changes.push({ productId, beforeCentimes: previous, afterCentimes: count > 0 ? cost : previous });
  }
  return changes;
}

// Learned at "Valider": next time this wording from this supplier is a sure match
async function saveName(tx: Prisma.TransactionClient, supplierId: string, label: string, productId: string) {
  const key = labelKey(label);
  if (!key) {
    return;
  }
  await tx.$executeRaw`
    INSERT INTO supplier_product_names (id, supplier_id, label_raw, label_key, product_id)
    VALUES (gen_random_uuid(), ${supplierId}::uuid, ${label.trim()}, ${key}, ${productId}::uuid)
    ON CONFLICT (supplier_id, label_key) DO UPDATE SET
      label_raw = EXCLUDED.label_raw,
      product_id = EXCLUDED.product_id,
      times_confirmed = CASE WHEN supplier_product_names.product_id = EXCLUDED.product_id
                             THEN supplier_product_names.times_confirmed + 1 ELSE 1 END,
      last_confirmed_at = now()`;
}

const withoutSpaces = (text: string | null) => text?.replace(/\s+/g, '') || null;
