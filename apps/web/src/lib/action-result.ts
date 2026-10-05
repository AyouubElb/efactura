import { z } from 'zod';
import type { ApiError } from './api-core';

// code: the API's own code, when the screen offers a next step for it
export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | {
      ok: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
    };

export type ActionFailure = Extract<ActionResult, { ok: false }>;

export const FIX_FIELDS = 'Corrigez les champs signalés.';
export const NOT_ANSWERING =
  "L'application ne répond pas. Réessayez dans un instant.";

export function toActionError(error: ApiError): ActionFailure {
  if (error.statusCode === 400 && error.fields) {
    return {
      ok: false,
      error: FIX_FIELDS,
      fieldErrors: Object.fromEntries(
        Object.entries(error.fields).map(([field, message]) => [
          field,
          [sentence(message)],
        ]),
      ),
    };
  }
  return { ok: false, error: messageFor(error), code: error.code };
}

export function fromZod(error: z.ZodError): ActionFailure {
  const { fieldErrors } = z.flattenError(error);
  return {
    ok: false,
    error: FIX_FIELDS,
    fieldErrors: fieldErrors as Record<string, string[]>,
  };
}

function messageFor({ statusCode, message }: ApiError): string {
  if (statusCode === 0) {
    return NOT_ANSWERING;
  }
  if (statusCode === 401) {
    return 'Votre session a pris fin. Connectez-vous à nouveau.';
  }
  if (statusCode === 403) {
    return "Action réservée à l'administrateur.";
  }
  if (statusCode === 429) {
    return "Trop d'essais. Attendez 15 minutes avant de réessayer.";
  }
  if (statusCode >= 500) {
    return "L'application a rencontré un problème. Réessayez dans un instant.";
  }
  return sentence(message);
}

function sentence(message: string): string {
  return /[.!?…]$/.test(message) ? message : `${message}.`;
}
