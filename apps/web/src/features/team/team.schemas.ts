import { z } from 'zod';
import { requiredText } from '@/lib/form-rules';

export const inviteSchema = z.object({
  fullName: requiredText(
    100,
    'Saisissez le nom complet.',
    'Le nom fait 100 caractères au plus.',
  ),
  email: z
    .string()
    .trim()
    .min(1, "Saisissez l'e-mail.")
    .max(254, "L'e-mail est trop long.")
    .pipe(z.email("Vérifiez l'e-mail : il ressemble à nom@exemple.ma.")),
  role: z.enum(['admin', 'staff'], 'Choisissez un rôle.'),
});
export type InviteInput = z.infer<typeof inviteSchema>;

export const roleSchema = z.enum(['admin', 'staff']);
