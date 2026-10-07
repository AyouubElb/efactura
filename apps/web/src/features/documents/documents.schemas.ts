import { z } from 'zod';
import { parseMoneyInput } from '@/lib/money-input';
import { parseQuantityInput } from '@/lib/quantity';

// The API's own ceilings: 10 million DH a unit, 200 lines a document
const MAX_PRICE_CENTIMES = 1_000_000_000;
export const MAX_LINES = 200;

export const draftLineSchema = z.object({
  productId: z.uuid().nullable(),
  // Shown only: the API copies the product's own reference
  reference: z.string().nullable(),
  label: z
    .string()
    .trim()
    .min(1, 'Saisissez la désignation.')
    .max(200, 'La désignation fait 200 caractères au plus.'),
  unit: z
    .string()
    .trim()
    .min(1, "Saisissez l'unité.")
    .max(20, "L'unité fait 20 caractères au plus."),
  quantity: z
    .string()
    .trim()
    .min(1, 'Saisissez la quantité.')
    .refine(
      (text) => parseQuantityInput(text) !== null,
      'Quantité : par exemple 10 ou 2,5.',
    ),
  price: z
    .string()
    .trim()
    .min(1, 'Saisissez le prix HT.')
    .refine(
      (text) => parseMoneyInput(text) !== null,
      'Prix : par exemple 6 490,00.',
    )
    .refine(
      (text) => (parseMoneyInput(text) ?? 0) <= MAX_PRICE_CENTIMES,
      'Le prix ne dépasse pas 10 000 000,00 MAD.',
    ),
  tvaRate: z.string().regex(/^\d{1,5}$/, 'Choisissez un taux de TVA.'),
});
export type DraftLineInput = z.infer<typeof draftLineSchema>;

export const draftSchema = z.object({
  clientId: z.uuid('Choisissez un client.'),
  lines: z
    .array(draftLineSchema)
    .min(1, 'Ajoutez au moins une ligne.')
    .max(MAX_LINES, 'Un document compte 200 lignes au plus.'),
  notes: z
    .string()
    .trim()
    .max(1000, 'Les notes font 1 000 caractères au plus.'),
});
export type DraftInput = z.infer<typeof draftSchema>;

export const channelSchema = z.enum(['whatsapp', 'email', 'download']);
