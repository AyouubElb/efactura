export const ACCESS_COOKIE = 'efa_access';
export const REFRESH_COOKIE = 'efa_refresh';

const ACCESS_LIFETIME_SECONDS = 15 * 60;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: string;
}

export interface SessionCookie {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge?: number;
  expires?: Date;
}

export const COOKIE_FLAGS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
} as const;

export function sessionCookies(pair: TokenPair): SessionCookie[] {
  return [
    {
      name: ACCESS_COOKIE,
      value: pair.accessToken,
      maxAge: ACCESS_LIFETIME_SECONDS,
      ...COOKIE_FLAGS,
    },
    {
      name: REFRESH_COOKIE,
      value: pair.refreshToken,
      expires: new Date(pair.refreshExpiresAt),
      ...COOKIE_FLAGS,
    },
  ];
}

// Reads the expiry without checking the signature: NestJS checks every call
export function expiresWithin(accessToken: string, seconds: number): boolean {
  try {
    const payload = accessToken.split('.')[1] ?? '';
    const { exp } = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: unknown };
    return typeof exp !== 'number' || exp * 1000 - Date.now() < seconds * 1000;
  } catch {
    return true;
  }
}
