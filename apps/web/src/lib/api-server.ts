import 'server-only';
import { notFound, redirect } from 'next/navigation';
import {
  callApi,
  callApiFile,
  type ApiError,
  type ApiFile,
  type ApiResult,
  type HttpMethod,
  type PageMeta,
} from './api-core';
import { accessToken, clientIp, loginAgainUrl, renewInAction } from './session';

export class ApiReadError extends Error {
  constructor(readonly error: ApiError) {
    super(`${error.statusCode} ${error.code}: ${error.message}`);
    this.name = 'ApiReadError';
  }
}

export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}

// Reads, for Server Components: they throw to error.tsx; a lost session goes back to the login
async function read<T>(path: string) {
  const result = await callApi<T>(path, {
    accessToken: await accessToken(),
    clientIp: await clientIp(),
  });
  if (result.ok) {
    return result;
  }
  if (result.error.statusCode === 401) {
    redirect(await loginAgainUrl());
  }
  if (result.error.statusCode === 404) {
    notFound();
  }
  throw new ApiReadError(result.error);
}

export async function apiGet<T>(path: string): Promise<T> {
  return (await read<T>(path)).data;
}

export async function apiGetPage<T>(path: string): Promise<Paged<T>> {
  const { data, meta } = await read<T[]>(path);
  return {
    items: data,
    meta: meta ?? { page: 1, pageSize: data.length, total: data.length },
  };
}

// Writes, for Server Actions: they return; a 401 renews the session and tries once more
export async function apiSend<T = null>(
  method: Exclude<HttpMethod, 'GET'>,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const ip = await clientIp();
  const first = await callApi<T>(path, {
    method,
    body,
    accessToken: await accessToken(),
    clientIp: ip,
  });
  if (first.ok || first.error.statusCode !== 401) {
    return first;
  }

  const renewal = await renewInAction();
  if (renewal.kind === 'ended') {
    redirect(await loginAgainUrl());
  }
  if (renewal.kind !== 'renewed') {
    return {
      ok: false,
      error: {
        statusCode: 0,
        code: renewal.kind === 'raced' ? 'RACED' : 'UNREACHABLE',
        message: "L'application ne répond pas.",
      },
    };
  }
  return callApi<T>(path, {
    method,
    body,
    accessToken: renewal.accessToken,
    clientIp: ip,
  });
}

export async function apiSendPublic<T = null>(
  method: Exclude<HttpMethod, 'GET'>,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  return callApi<T>(path, { method, body, clientIp: await clientIp() });
}

export async function apiGetPublic<T>(path: string): Promise<ApiResult<T>> {
  return callApi<T>(path, { clientIp: await clientIp() });
}

// Route Handlers answer for themselves: a lost session comes back as a 401, never a redirect
export async function apiRead<T>(path: string): Promise<ApiResult<T>> {
  return withRenewal((token, ip) =>
    callApi<T>(path, { accessToken: token, clientIp: ip }),
  );
}

export async function apiReadFile(path: string): Promise<ApiResult<ApiFile>> {
  return withRenewal((token, ip) =>
    callApiFile(path, { accessToken: token, clientIp: ip }),
  );
}

async function withRenewal<T>(
  call: (token: string | undefined, ip: string | null) => Promise<ApiResult<T>>,
): Promise<ApiResult<T>> {
  const ip = await clientIp();
  const first = await call(await accessToken(), ip);
  if (first.ok || first.error.statusCode !== 401) {
    return first;
  }
  const renewal = await renewInAction();
  if (renewal.kind === 'renewed') {
    return call(renewal.accessToken, ip);
  }
  return {
    ok: false,
    error:
      renewal.kind === 'ended'
        ? {
            statusCode: 401,
            code: 'SESSION_ENDED',
            message: 'Votre session a pris fin.',
          }
        : {
            statusCode: 0,
            code: renewal.kind === 'raced' ? 'RACED' : 'UNREACHABLE',
            message: "L'application ne répond pas.",
          },
  };
}
