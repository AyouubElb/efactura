import { z } from 'zod';
import { parseMoneyInput } from '@/lib/money-input';

// 10 million DH, the API's own ceiling
const MAX_PRICE_CENTIMES = 1_000_000_000;

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Saisissez le nom du produit.')
    .max(200, 'Le nom fait 200 caractères au plus.'),
  reference: z
    .string()
    .trim()
    .max(50, 'La référence fait 50 caractères au plus.'),
  unit: z
    .string()
    .trim()
    .min(1, "Saisissez l'unité, par exemple pièce.")
    .max(20, "L'unité fait 20 caractères au plus."),
  price: z
    .string()
    .trim()
    .min(1, 'Saisissez le prix de vente HT.')
    .refine(
      (text) => parseMoneyInput(text) !== null,
      'Vérifiez le prix : par exemple 3 575,00.',
    )
    .refine(
      (text) => (parseMoneyInput(text) ?? 0) <= MAX_PRICE_CENTIMES,
      'Le prix ne dépasse pas 10 000 000,00 MAD.',
    ),
  tvaRate: z.string().regex(/^\d{1,5}$/, 'Choisissez un taux de TVA.'),
});
export type ProductInput = z.infer<typeof productSchema>;
