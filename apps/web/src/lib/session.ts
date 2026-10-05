import 'server-only';
import { cookies, headers } from 'next/headers';
import { callApi, renewSession, WAKE_TIMEOUT_MS } from './api-core';
import { PATH_HEADER, safeNextPath } from './next-path';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  sessionCookies,
  type TokenPair,
} from './session-cookies';

export async function accessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

// The visitor's address, so the API's login limit counts people, not the web server
export async function clientIp(): Promise<string | null> {
  const forwarded = (await headers()).get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || null;
}

export async function saveSession(pair: TokenPair): Promise<void> {
  const store = await cookies();
  for (const cookie of sessionCookies(pair)) {
    store.set(cookie);
  }
}

export interface EndedSession {
  accessToken?: string;
  refreshToken?: string;
  clientIp: string | null;
}

export async function clearSession(): Promise<EndedSession> {
  const store = await cookies();
  const ended = {
    accessToken: store.get(ACCESS_COOKIE)?.value,
    refreshToken: store.get(REFRESH_COOKIE)?.value,
    clientIp: await clientIp(),
  };
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  return ended;
}

// An expired pass is renewed only so its session can be closed
export async function closeSessionAtApi({
  accessToken,
  refreshToken,
  clientIp,
}: EndedSession): Promise<void> {
  if (accessToken) {
    const result = await callApi('/auth/logout', {
      method: 'POST',
      accessToken,
      clientIp,
    });
    if (result.ok || result.error.statusCode !== 401) {
      return;
    }
  }
  if (!refreshToken) {
    return;
  }
  const renewal = await renewSession(refreshToken, clientIp, WAKE_TIMEOUT_MS);
  if (renewal.kind === 'renewed') {
    await callApi('/auth/logout', {
      method: 'POST',
      accessToken: renewal.pair.accessToken,
      clientIp,
    });
  }
}

export type ActionRenewal =
  | { kind: 'renewed'; accessToken: string }
  | { kind: 'raced' | 'ended' | 'unreachable' };

// Server Actions only: cookies can't change while a page is being drawn
export async function renewInAction(): Promise<ActionRenewal> {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return { kind: 'ended' };
  }
  const renewal = await renewSession(refreshToken, await clientIp());
  if (renewal.kind !== 'renewed') {
    return renewal;
  }
  await saveSession(renewal.pair);
  return { kind: 'renewed', accessToken: renewal.pair.accessToken };
}

// proxy.ts clears the stale cookies on the way, then the login brings the person back here
export async function loginAgainUrl(): Promise<string> {
  const here = safeNextPath((await headers()).get(PATH_HEADER));
  return here
    ? `/login?expired=1&next=${encodeURIComponent(here)}`
    : '/login?expired=1';
}
