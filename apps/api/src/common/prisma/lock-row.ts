import { Prisma } from '../../generated/prisma/client.js';

type Table =
  | 'products'
  | 'clients'
  | 'suppliers'
  | 'quotes'
  | 'invoices'
  | 'share_links';

// A second edit of the same row waits here, then reads what the first one saved
export async function lockRow(
  tx: Prisma.TransactionClient,
  table: Table,
  id: string,
) {
  await tx.$queryRaw`SELECT 1 FROM ${Prisma.raw(table)} WHERE id = ${id}::uuid FOR UPDATE`;
}
