// proxy.ts writes the page being drawn here, for the return trip after a login
export const PATH_HEADER = 'x-efa-path';

const ORIGIN = 'http://efactura.invalid';

// Accepts only a path inside this app: never //host or a full address
export function safeNextPath(value: unknown): string | null {
  const path: unknown = Array.isArray(value) ? value[0] : value;
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.startsWith('//')
  ) {
    return null;
  }
  try {
    const url = new URL(path, ORIGIN);
    return url.origin === ORIGIN ? url.pathname + url.search : null;
  } catch {
    return null;
  }
}
