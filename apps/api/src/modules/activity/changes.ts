import type { Prisma } from '../../generated/prisma/client.js';

type Fields = Record<string, Prisma.InputJsonValue | Date | null | undefined>;

// Only the fields that changed, before and after; null when nothing changed
export function changes<T extends Fields>(before: T | null, after: T) {
  const keys = Object.keys(after).filter(
    (key) =>
      JSON.stringify(before?.[key] ?? null) !==
      JSON.stringify(after[key] ?? null),
  );
  if (keys.length === 0) {
    return null;
  }
  const pick = (source: T) =>
    Object.fromEntries(
      keys.map((key) => [key, toJson(source[key])]),
    ) as Prisma.InputJsonObject;
  return { before: before ? pick(before) : null, after: pick(after) };
}

function toJson(value: Fields[string]) {
  return value instanceof Date ? value.toISOString() : (value ?? null);
}
