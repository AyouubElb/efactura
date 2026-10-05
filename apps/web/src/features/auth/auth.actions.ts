'use server';

import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { fromZod, toActionError, type ActionResult } from '@/lib/action-result';
import { apiSendPublic } from '@/lib/api-server';
import { safeNextPath } from '@/lib/next-path';
import { clearSession, closeSessionAtApi, saveSession } from '@/lib/session';
import type { TokenPair } from '@/lib/session-cookies';
import {
  forgotPasswordSchema,
  linkTokenSchema,
  loginSchema,
  setPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type SetPasswordInput,
} from './auth.schemas';
import type { Me } from './auth.types';

const WRONG_LOGIN =
  'E-mail ou mot de passe incorrect. Après 5 essais, attendez 15 minutes.';
const INVITE_LINK_USED =
  "Ce lien d'invitation n'est plus valide. Demandez à l'administrateur de vous inviter à nouveau.";
const RESET_LINK_USED =
  "Ce lien n'est plus valide. Demandez un nouveau lien ci-dessous.";

export async function login(
  input: LoginInput,
  next: string | null,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  const result = await apiSendPublic<TokenPair & { user: Me }>(
    'POST',
    '/auth/login',
    parsed.data,
  );
  if (!result.ok) {
    return result.error.code === 'INVALID_CREDENTIALS'
      ? { ok: false, error: WRONG_LOGIN }
      : toActionError(result.error);
  }
  await saveSession(result.data);
  redirect(safeNextPath(next) ?? '/dashboard');
}

// The cookies go at once; the API closes the session in the background, even while it wakes up
export async function logout(): Promise<void> {
  const ended = await clearSession();
  after(() => closeSessionAtApi(ended));
  redirect('/login');
}

// The same answer whether or not the address has an account
export async function forgotPassword(
  input: ForgotPasswordInput,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  const result = await apiSendPublic('POST', '/auth/password/forgot', {
    email: parsed.data.email,
  });
  return result.ok ? { ok: true } : toActionError(result.error);
}

export async function acceptInvite(
  token: string,
  input: SetPasswordInput,
): Promise<ActionResult> {
  return setPassword('/auth/invite/accept', token, input, INVITE_LINK_USED);
}

export async function resetPassword(
  token: string,
  input: SetPasswordInput,
): Promise<ActionResult> {
  return setPassword('/auth/password/reset', token, input, RESET_LINK_USED);
}

async function setPassword(
  path: string,
  token: string,
  input: SetPasswordInput,
  linkUsed: string,
): Promise<ActionResult> {
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  const link = linkTokenSchema.safeParse(token);
  if (!link.success) {
    return { ok: false, error: linkUsed, code: 'INVALID_LINK' };
  }
  const result = await apiSendPublic('POST', path, {
    token: link.data,
    password: parsed.data.password,
  });
  if (!result.ok) {
    return result.error.code === 'INVALID_LINK'
      ? { ok: false, error: linkUsed, code: 'INVALID_LINK' }
      : toActionError(result.error);
  }
  redirect('/login?password=set');
}
