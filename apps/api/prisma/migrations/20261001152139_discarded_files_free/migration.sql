-- DropIndex
DROP INDEX "purchase_invoices_file_sha256_key";

-- Written by hand: Prisma can't express "unique only among some rows".
-- The same file is imported once, but a discarded upload never blocks it again.
CREATE UNIQUE INDEX purchase_invoices_file_sha256_active_key
  ON purchase_invoices (file_sha256)
  WHERE status <> 'discarded';
