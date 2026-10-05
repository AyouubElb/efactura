import type { TokenPair } from './session-cookies';

// Free hosting sleeps: the first call after a quiet spell waits about a minute
export const WAKE_TIMEOUT_MS = 90_000;
const RENEW_TIMEOUT_MS = 10_000;

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export type ApiResult<T> =
  { ok: true; data: T; meta?: PageMeta } | { ok: false; error: ApiError };

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface CallOptions {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string;
  clientIp?: string | null;
  timeoutMs?: number;
}

// Read on the server only, never sent to a browser
function apiUrl(): string {
  const url = process.env.API_URL;
  if (!url) {
    throw new Error('API_URL is not set');
  }
  return url.replace(/\/+$/, '');
}

function internalKey(): string {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) {
    throw new Error('INTERNAL_API_KEY is not set');
  }
  return key;
}

export async function callApi<T>(
  path: string,
  {
    method = 'GET',
    body,
    accessToken,
    clientIp,
    timeoutMs = WAKE_TIMEOUT_MS,
  }: CallOptions = {},
): Promise<ApiResult<T>> {
  const headers = new Headers({
    Accept: 'application/json',
    'X-Internal-Key': internalKey(),
  });
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (clientIp) {
    headers.set('X-Forwarded-For', clientIp);
  }

  let response: Response;
  try {
    response = await fetchUntilAnswered(
      `${apiUrl()}${path}`,
      {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
      },
      timeoutMs,
    );
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === 'TimeoutError';
    return {
      ok: false,
      error: {
        statusCode: 0,
        code: timedOut ? 'TIMEOUT' : 'UNREACHABLE',
        message: "L'application ne répond pas.",
      },
    };
  }

  const payload: unknown = await response.json().catch(() => null);
  if (isEnvelope(payload)) {
    return payload.success
      ? { ok: true, data: payload.data as T, meta: payload.meta }
      : { ok: false, error: payload.error };
  }
  return {
    ok: false,
    error: {
      statusCode: response.status,
      code: 'UNEXPECTED_ANSWER',
      message: "L'application a rencontré un problème.",
    },
  };
}

const REFUSED_RETRY_MS = 2_000;

// A refused connection sent nothing, so trying again is safe, even for a write
async function fetchUntilAnswered(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(Math.max(deadline - Date.now(), 1)),
      });
    } catch (error) {
      const refused =
        error instanceof TypeError &&
        (error.cause as { code?: string } | undefined)?.code === 'ECONNREFUSED';
      if (!refused || Date.now() + REFUSED_RETRY_MS >= deadline) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, REFUSED_RETRY_MS));
    }
  }
}

type Envelope =
  | { success: true; data: unknown; meta?: PageMeta }
  | { success: false; error: ApiError };

function isEnvelope(payload: unknown): payload is Envelope {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  const { success, error } = payload as { success?: unknown; error?: unknown };
  return success === true || (success === false && typeof error === 'object');
}

// Public and cheap: any call also wakes a sleeping API
export async function pingApi(timeoutMs: number): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl()}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export type Renewal =
  | { kind: 'renewed'; pair: TokenPair }
  | { kind: 'raced' }
  | { kind: 'ended' }
  | { kind: 'unreachable' };

// "raced": another request renewed this session a moment ago, so its cookies stay
export async function renewSession(
  refreshToken: string,
  clientIp: string | null,
  timeoutMs = RENEW_TIMEOUT_MS,
): Promise<Renewal> {
  const result = await callApi<TokenPair>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    clientIp,
    timeoutMs,
  });
  if (result.ok) {
    return { kind: 'renewed', pair: result.data };
  }
  if (result.error.code === 'ALREADY_REFRESHED') {
    return { kind: 'raced' };
  }
  const { statusCode } = result.error;
  return statusCode === 400 || statusCode === 401
    ? { kind: 'ended' }
    : { kind: 'unreachable' };
}
