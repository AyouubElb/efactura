import { Prisma } from '../../generated/prisma/client.js';

// A unique index refused the row: two people saved the same thing at once
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
