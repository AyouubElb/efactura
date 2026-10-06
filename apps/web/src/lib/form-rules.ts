import { isValidIceFormat } from '@efactura/shared';
import { z } from 'zod';

export const ICE_WRONG = "Vérifiez l'ICE : il compte 15 chiffres.";

// "001 525 878 000 045" is typed as often as "001525878000045"
export function withoutSpaces(text: string): string {
  return text.replace(/\s/g, '');
}

export function isIce(text: string): boolean {
  return isValidIceFormat(withoutSpaces(text));
}

export function optionalText(max: number, tooLong: string) {
  return z.string().trim().max(max, tooLong);
}

export function requiredText(max: number, missing: string, tooLong: string) {
  return z.string().trim().min(1, missing).max(max, tooLong);
}

export const optionalEmail = z
  .string()
  .trim()
  .max(254, "L'e-mail est trop long.")
  .refine(
    (value) => value === '' || z.email().safeParse(value).success,
    "Vérifiez l'e-mail : il ressemble à nom@exemple.ma.",
  );

export const optionalIce = z
  .string()
  .trim()
  .refine((value) => value === '' || isIce(value), ICE_WRONG);

// A count of days typed as text: "" keeps the shop's default
export function days(max: number, wrong: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' || (/^\d{1,3}$/.test(value) && Number(value) <= max),
      wrong,
    );
}

// The API clears an optional field it receives empty
export function orNull(value: string): string | null {
  return value === '' ? null : value;
}
