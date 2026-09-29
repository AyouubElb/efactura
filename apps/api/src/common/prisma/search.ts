import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from './prisma.service.js';

// The typed text, lowercase and without accents, like the trigram indexes
export function searchText(search: string) {
  return Prisma.sql`lower(f_unaccent(${search}))`;
}

// French order on the PC and on Neon alike: "apple < ASUS < Câble < École"
export const BY_NAME = Prisma.sql`lower(f_unaccent(name)) COLLATE "C", id`;

// Every typed word is in one of the columns, or close to a word there: "samsng a55"
export function allWordsMatch(search: string, columns: Prisma.Sql[]) {
  const words = search.split(/\s+/).filter(Boolean).slice(0, 8);
  return Prisma.join(
    words.map((word) => {
      const text = searchText(word);
      const contains = searchText(`%${word.replace(/[\\%_]/g, '\\$&')}%`);
      const tests = columns.flatMap((column) => [
        Prisma.sql`${column} LIKE ${contains}`,
        Prisma.sql`${text} <% ${column}`,
      ]);
      return Prisma.sql`(${Prisma.join(tests, ' OR ')})`;
    }),
    ' AND ',
  );
}

// One page of ids in order, and how many rows match in all
export async function pageOfIds(
  prisma: PrismaService,
  from: Prisma.Sql,
  orderBy: Prisma.Sql,
  page: number,
  pageSize: number,
) {
  const [, rows, [{ total }]] = await prisma.$transaction([
    // A typo like "samsng" scores 0.57: the default bar of 0.6 misses it
    prisma.$executeRaw`SET LOCAL pg_trgm.word_similarity_threshold = 0.5`,
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id ${from} ORDER BY ${orderBy}
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    prisma.$queryRaw<{ total: bigint }[]>`SELECT count(*) AS total ${from}`,
  ]);
  return { ids: rows.map((row) => row.id), total: Number(total) };
}

// findMany({ id: { in } }) loses the order: put it back
export function inOrder<T extends { id: string }>(ids: string[], rows: T[]) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}
