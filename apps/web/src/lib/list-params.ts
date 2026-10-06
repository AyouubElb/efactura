import type { PageMeta } from './api-core';

export type SearchParams = Record<string, string | string[] | undefined>;

export interface ListParams {
  search: string;
  archived: boolean;
  page: number;
}

const MAX_SEARCH = 100;
const MAX_PAGE = 10_000;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// The address is typed by anyone: anything odd falls back instead of reaching the API
export function readListParams(params: SearchParams): ListParams {
  const page = Number(first(params.page));
  return {
    search: (first(params.search) ?? '').trim().slice(0, MAX_SEARCH),
    archived: first(params.archived) === 'true',
    page: Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1,
  };
}

// Page 1 and the Actifs tab keep the address clean
export function listHref(
  pathname: string,
  { search, archived, page }: ListParams,
): string {
  const query = new URLSearchParams();
  if (search) {
    query.set('search', search);
  }
  if (archived) {
    query.set('archived', 'true');
  }
  if (page > 1) {
    query.set('page', String(page));
  }
  const text = query.toString();
  return text ? `${pathname}?${text}` : pathname;
}

// A page emptied by an archive: the last page that still has rows
export function lastPageHref(
  pathname: string,
  params: ListParams,
  meta: PageMeta,
): string | null {
  const last = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  return params.page > last
    ? listHref(pathname, { ...params, page: last })
    : null;
}

export function apiListQuery({ search, archived, page }: ListParams): string {
  const query = new URLSearchParams({
    archived: String(archived),
    page: String(page),
  });
  if (search) {
    query.set('search', search);
  }
  return query.toString();
}
