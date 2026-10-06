import { z } from 'zod';
import {
  ICE_WRONG,
  isIce,
  optionalEmail,
  optionalText,
  requiredText,
  withoutSpaces,
} from '@/lib/form-rules';

function wholeDays(min: number, max: number, wrong: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        /^\d{1,3}$/.test(value) && Number(value) >= min && Number(value) <= max,
      wrong,
    );
}

export const settingsSchema = z.object({
  legalName: requiredText(
    150,
    'Saisissez la raison sociale.',
    'La raison sociale fait 150 caractères au plus.',
  ),
  address: requiredText(
    200,
    "Saisissez l'adresse.",
    "L'adresse fait 200 caractères au plus.",
  ),
  city: requiredText(
    100,
    'Saisissez la ville.',
    'La ville fait 100 caractères au plus.',
  ),
  phone: optionalText(30, 'Le téléphone fait 30 caractères au plus.'),
  email: optionalEmail,
  ice: z
    .string()
    .trim()
    .min(1, "Saisissez l'ICE de la boutique.")
    .refine(isIce, ICE_WRONG),
  ifNumber: requiredText(
    20,
    "Saisissez l'identifiant fiscal.",
    "L'identifiant fiscal fait 20 caractères au plus.",
  ),
  tpNumber: requiredText(
    20,
    'Saisissez le numéro de taxe professionnelle.',
    'Le numéro fait 20 caractères au plus.',
  ),
  rcNumber: requiredText(
    20,
    'Saisissez le numéro du registre de commerce.',
    'Le numéro fait 20 caractères au plus.',
  ),
  rcCity: requiredText(
    100,
    'Saisissez la ville du registre de commerce.',
    'La ville fait 100 caractères au plus.',
  ),
  bankName: optionalText(
    100,
    'Le nom de la banque fait 100 caractères au plus.',
  ),
  rib: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^\d{24}$/.test(withoutSpaces(value)),
      'Vérifiez le RIB : il compte 24 chiffres.',
    ),
  defaultPaymentDays: wholeDays(0, 120, 'Le délai va de 0 à 120 jours.'),
  defaultQuoteValidityDays: wholeDays(
    1,
    365,
    'La validité va de 1 à 365 jours.',
  ),
  tvaRatesBp: z
    .array(z.number().int().min(0).max(10_000))
    .min(1, 'Gardez au moins un taux de TVA.')
    .max(10, 'Gardez 10 taux au plus.'),
  // Hidden until the price warnings arrive: sent back as it was saved
  priceRiseThresholdPercent: z.number().int().min(1).max(100),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const numberingSchema = z.object({
  startAt: z
    .string()
    .trim()
    .refine(
      (value) => /^\d{1,6}$/.test(value) && Number(value) >= 1,
      'Saisissez un nombre entre 1 et 999 999.',
    ),
});
export type NumberingInput = z.infer<typeof numberingSchema>;
