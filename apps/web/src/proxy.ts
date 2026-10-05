import { NextResponse, type NextRequest } from 'next/server';
import { pingApi, renewSession } from '@/lib/api-core';
import { PATH_HEADER, safeNextPath } from '@/lib/next-path';
import {
  ACCESS_COOKIE,
  COOKIE_FLAGS,
  REFRESH_COOKIE,
  expiresWithin,
  sessionCookies,
} from '@/lib/session-cookies';

const PUBLIC_PAGES = new Set(['/login', '/forgot-password', '/starting']);
const PUBLIC_PREFIXES = ['/invitation/', '/reset-password/', '/d/'];

const RENEW_BEFORE_SECONDS = 60;
// Asleep or not: the refresh pass is only spent on an API that answers
const AWAKE_CHECK_MS = 4_000;
const RACE_WAIT_MS = 1_000;
// Set by a failed renewal: a second failure in a row opens the login instead of looping
const RETRY_COOKIE = 'efa_retry';
const RETRY_WINDOW_SECONDS = 30;

// Comfort only: NestJS checks the pass on every call, whatever this file does
export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const here = pathname + search;
  // Server Actions are never redirected here: each action handles its own 401
  const isAction = request.headers.has('next-action');
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const retried = request.cookies.has(RETRY_COOKIE);

  const forward = (cookieHeader?: string) => {
    const headers = new Headers(request.headers);
    headers.set(PATH_HEADER, here);
    if (cookieHeader !== undefined) {
      headers.set('cookie', cookieHeader);
    }
    return NextResponse.next({ request: { headers } });
  };
  const goTo = (path: string) =>
    NextResponse.redirect(new URL(path, request.url));
  const withoutSession = (response: NextResponse) => {
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    if (retried) {
      response.cookies.delete(RETRY_COOKIE);
    }
    return response;
  };
  const withNext = (page: string) =>
    pathname === '/' ? page : `${page}?next=${encodeURIComponent(here)}`;
  const retryOnce = async (path: string, waitMs = 0) => {
    if (retried) {
      return withoutSession(goTo(withNext('/login')));
    }
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    const response = goTo(path);
    response.cookies.set(RETRY_COOKIE, '1', {
      ...COOKIE_FLAGS,
      maxAge: RETRY_WINDOW_SECONDS,
    });
    return response;
  };

  if (pathname === '/login' && !isAction) {
    if (searchParams.has('expired')) {
      return withoutSession(forward());
    }
    if (refreshToken) {
      return goTo(safeNextPath(searchParams.get('next')) ?? '/dashboard');
    }
    return forward();
  }
  if (
    PUBLIC_PAGES.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return forward();
  }

  if (!refreshToken) {
    return isAction ? forward() : goTo(withNext('/login'));
  }
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken && !expiresWithin(accessToken, RENEW_BEFORE_SECONDS)) {
    return forward();
  }

  if (!(await pingApi(AWAKE_CHECK_MS))) {
    return isAction ? forward() : goTo(withNext('/starting'));
  }
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const renewal = await renewSession(refreshToken, clientIp);

  switch (renewal.kind) {
    case 'renewed': {
      // The page drawn now already uses the new pass
      request.cookies.set(ACCESS_COOKIE, renewal.pair.accessToken);
      request.cookies.set(REFRESH_COOKIE, renewal.pair.refreshToken);
      const response = forward(request.cookies.toString());
      for (const cookie of sessionCookies(renewal.pair)) {
        response.cookies.set(cookie);
      }
      if (retried) {
        response.cookies.delete(RETRY_COOKIE);
      }
      return response;
    }
    case 'raced':
      if (isAction || (accessToken && !expiresWithin(accessToken, 0))) {
        return forward();
      }
      // Another request renewed a moment ago: its cookies reach the browser during the wait
      return retryOnce(here, RACE_WAIT_MS);
    case 'ended':
      return withoutSession(isAction ? forward() : goTo(withNext('/login')));
    case 'unreachable':
      return isAction ? forward() : retryOnce(withNext('/starting'));
  }
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml|woff2?)$).*)',
      // Prefetches draw only the loading skeleton: no session work for them
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
