import { z } from 'zod';

// Run in the browser while typing, then again in the Server Action
const email = z
  .string()
  .trim()
  .min(1, 'Saisissez votre e-mail.')
  .max(254, "L'e-mail est trop long.")
  .pipe(z.email("Vérifiez l'e-mail : il ressemble à nom@exemple.ma."));

export const loginSchema = z.object({
  email,
  password: z
    .string()
    .min(1, 'Saisissez votre mot de passe.')
    .max(200, 'Le mot de passe fait 200 caractères au plus.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Choisissez 8 caractères au moins.')
      .max(200, 'Choisissez 200 caractères au plus.'),
    confirm: z.string().min(1, 'Saisissez le mot de passe une seconde fois.'),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'Les deux mots de passe sont différents.',
  });
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

export const linkTokenSchema = z.string().min(1).max(100);
