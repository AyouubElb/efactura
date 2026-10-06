import { z } from 'zod';
import {
  optionalEmail,
  optionalIce,
  optionalText,
  requiredText,
} from '@/lib/form-rules';

export const supplierSchema = z.object({
  name: requiredText(
    150,
    'Saisissez le nom du fournisseur.',
    'Le nom fait 150 caractères au plus.',
  ),
  ice: optionalIce,
  ifNumber: optionalText(
    20,
    "L'identifiant fiscal fait 20 caractères au plus.",
  ),
  address: optionalText(200, "L'adresse fait 200 caractères au plus."),
  city: optionalText(100, 'La ville fait 100 caractères au plus.'),
  phone: optionalText(30, 'Le téléphone fait 30 caractères au plus.'),
  email: optionalEmail,
});
export type SupplierInput = z.infer<typeof supplierSchema>;
