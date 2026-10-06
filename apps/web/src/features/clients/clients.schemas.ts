import { z } from 'zod';
import {
  days,
  ICE_WRONG,
  isIce,
  optionalEmail,
  optionalText,
  requiredText,
} from '@/lib/form-rules';

export const clientSchema = z
  .object({
    type: z.enum(['company', 'individual'], 'Choisissez le type de client.'),
    name: requiredText(
      150,
      'Saisissez le nom du client.',
      'Le nom fait 150 caractères au plus.',
    ),
    ice: z.string().trim(),
    address: optionalText(200, "L'adresse fait 200 caractères au plus."),
    city: optionalText(100, 'La ville fait 100 caractères au plus.'),
    email: optionalEmail,
    phone: optionalText(30, 'Le téléphone fait 30 caractères au plus.'),
    paymentDays: days(120, 'Le délai va de 0 à 120 jours.'),
  })
  .superRefine((values, context) => {
    if (values.type !== 'company') {
      return;
    }
    if (values.ice === '') {
      context.addIssue({
        code: 'custom',
        path: ['ice'],
        message: "Saisissez l'ICE : une entreprise en a toujours un.",
      });
    } else if (!isIce(values.ice)) {
      context.addIssue({ code: 'custom', path: ['ice'], message: ICE_WRONG });
    }
  });
export type ClientInput = z.infer<typeof clientSchema>;
