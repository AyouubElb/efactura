import { LINE_QUANTITY_PATTERN, MAX_CENTIMES } from '@efactura/shared';
import { z } from 'zod';
import { productSchema } from '@/features/products/products.schemas';
import { supplierSchema } from '@/features/suppliers/suppliers.schemas';
import { parseSignedMoneyInput } from '@/lib/money-input';
import { FILE_TYPES, MAX_FILE_BYTES } from './purchases.types';

// The API's own ceilings: 10 million DH a unit, 200 lines an achat
const MAX_PRICE_CENTIMES = 1_000_000_000;
const MAX_LINES = 200;
const SHA256 = /^[0-9a-f]{64}$/;

const text = (max: number) => z.string().max(max);
const rate = z.string().regex(/^\d{0,5}$/);

const newProductSchema = z.object({
  name: text(1000),
  reference: text(200),
  unit: text(50),
  price: text(50),
  tvaRate: rate,
});

const lineSchema = z.object({
  label: text(1000),
  reference: text(200),
  quantity: text(50),
  price: text(50),
  total: text(50),
  tvaRate: rate,
  productId: z.uuid().nullable(),
  match: z
    .enum(['saved_name', 'reference', 'closest_name', 'manual', 'new_product'])
    .nullable(),
  candidates: z
    .array(z.object({ productId: z.uuid(), score: z.number().min(0).max(1) }))
    .max(3),
  newProduct: newProductSchema.nullable(),
  ignored: z.boolean(),
  notes: z.array(text(1000)).max(20),
});

// A save checks sizes only, so half-typed values are kept; "Valider" checks the rest
export const reviewSaveSchema = z.object({
  documentType: z.enum(['invoice', 'delivery_note', 'quote', 'other']),
  supplier: z.object({
    id: z.uuid().nullable(),
    name: text(1000),
    ice: text(50),
    ifNumber: text(50),
    address: text(1000),
  }),
  invoiceNumber: text(200),
  invoiceDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  pricesIncludeTax: z.boolean(),
  lines: z.array(lineSchema).max(MAX_LINES),
  totals: z.object({ ht: text(50), tva: text(50), ttc: text(50) }),
  notes: z.array(text(1000)).max(50),
});
export type ReviewInput = z.infer<typeof reviewSaveSchema>;
export type ReviewLineInput = ReviewInput['lines'][number];
export type NewProductInput = z.infer<typeof newProductSchema>;

export interface ReviewRules {
  // Morocco's day: an invoice can't be dated after it
  today: string;
  // The settings' rates, which a new product must use
  tvaRatesBp: number[];
  // Products archived since the brouillon chose them
  archived: string[];
}

const DISCOUNT = "Montant négatif : ignorez la ligne s'il s'agit d'une remise.";

type Issue = (path: PropertyKey[], message: string) => void;

// Every rule "Valider" checks, run first in the browser so each problem shows under its field
export function reviewSchema({ today, tvaRatesBp, archived }: ReviewRules) {
  return reviewSaveSchema.superRefine((values, ctx) => {
    const issue: Issue = (path, message) =>
      ctx.addIssue({ code: 'custom', path, message });
    if (values.documentType !== 'invoice') {
      issue(
        ['documentType'],
        "Ce document n'est pas une facture : corrigez son type ou écartez-le.",
      );
    }
    if (!values.invoiceNumber.trim()) {
      issue(['invoiceNumber'], 'Saisissez le numéro de la facture.');
    }
    if (!values.invoiceDate) {
      issue(['invoiceDate'], 'Choisissez la date de la facture.');
    } else if (values.invoiceDate > today) {
      issue(['invoiceDate'], 'La date ne peut pas être dans le futur.');
    }
    if (values.supplier.id === null) {
      const supplier = supplierSchema
        .pick({ name: true, ice: true, ifNumber: true, address: true })
        .safeParse(values.supplier);
      for (const problem of supplier.error?.issues ?? []) {
        issue(['supplier', ...problem.path], problem.message);
      }
    }
    for (const key of ['ht', 'tva', 'ttc'] as const) {
      const problem = amountProblem(values.totals[key], MAX_CENTIMES);
      if (problem) {
        issue(['totals', key], problem);
      }
    }
    if (values.lines.every((line) => line.ignored)) {
      issue(['lines'], 'Gardez au moins une ligne à enregistrer.');
    }
    values.lines.forEach((line, index) => {
      if (!line.ignored) {
        lineProblems(line, tvaRatesBp, archived, (path, message) =>
          issue(['lines', index, ...path], message),
        );
      }
    });
  });
}

function lineProblems(
  line: ReviewLineInput,
  tvaRatesBp: number[],
  archived: string[],
  issue: Issue,
) {
  if (!line.label.trim()) {
    issue(['label'], 'Saisissez le libellé.');
  }
  const quantity = line.quantity.replace(/\s/g, '').replace(',', '.');
  if (!LINE_QUANTITY_PATTERN.test(quantity)) {
    issue(['quantity'], 'Quantité : par exemple 10 ou 2,5.');
  }
  const price = amountProblem(line.price, MAX_PRICE_CENTIMES, DISCOUNT);
  if (price) {
    issue(['price'], price);
  }
  const total = amountProblem(line.total, MAX_CENTIMES, DISCOUNT);
  if (total) {
    issue(['total'], total);
  }
  if (!line.tvaRate) {
    issue(['tvaRate'], 'Choisissez un taux de TVA.');
  }
  if (line.match !== 'new_product') {
    if (!line.productId) {
      issue(
        ['productId'],
        'Choisissez un produit, créez-le ou ignorez la ligne.',
      );
    } else if (archived.includes(line.productId)) {
      issue(['productId'], 'Produit archivé : choisissez-en un autre.');
    }
    return;
  }
  if (!line.newProduct) {
    issue(['productId'], 'Décrivez le nouveau produit.');
    return;
  }
  const product = productSchema.safeParse(line.newProduct);
  for (const problem of product.error?.issues ?? []) {
    issue(['newProduct', ...problem.path], problem.message);
  }
  const productRate = line.newProduct.tvaRate;
  if (productRate && !tvaRatesBp.includes(Number(productRate))) {
    issue(
      ['newProduct', 'tvaRate'],
      "Ce taux n'est plus proposé : choisissez-en un autre.",
    );
  }
}

function amountProblem(
  text: string,
  max: number,
  negative = 'Le montant ne peut pas être négatif.',
): string | null {
  if (!text.trim()) {
    return 'Saisissez le montant.';
  }
  const centimes = parseSignedMoneyInput(text);
  if (centimes === null) {
    return 'Montant : par exemple 1 234,50.';
  }
  if (centimes < 0) {
    return negative;
  }
  return centimes > max ? 'Le montant est trop grand.' : null;
}

export const uploadLinkSchema = z.object({
  fileType: z.enum(FILE_TYPES),
  fileSize: z.int().min(1).max(MAX_FILE_BYTES),
  sha256: z.string().regex(SHA256),
});
export type UploadLinkInput = z.infer<typeof uploadLinkSchema>;

export const registerSchema = z.object({
  fileKey: z.string().regex(/^purchases\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/),
  sha256: z.string().regex(SHA256),
});
export type RegisterInput = z.infer<typeof registerSchema>;
