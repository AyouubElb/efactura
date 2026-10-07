import { z } from 'zod';
import { PAYMENT_LABELS } from '@/features/documents/documents.labels';
import { channelSchema } from '@/features/documents/documents.schemas';

export const paySchema = z.object({
  paidOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choisissez la date du paiement.'),
  // A plain string, so the tiles can start with none chosen
  method: z
    .string()
    .refine(
      (method) => Object.hasOwn(PAYMENT_LABELS, method),
      'Choisissez le mode de paiement.',
    ),
  reference: z
    .string()
    .trim()
    .max(100, 'La référence fait 100 caractères au plus.'),
});
export type PayInput = z.infer<typeof paySchema>;

export const cancelSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Saisissez le motif : il s'imprime sur l'avoir.")
    .max(200, 'Le motif fait 200 caractères au plus.'),
  channel: channelSchema,
});
export type CancelInput = z.infer<typeof cancelSchema>;
