-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- Written by hand: Prisma can't express "unique only among active rows".
-- An archived product or client never blocks a new one.

-- One active product per reference, case ignored: a reference match is a sure match
CREATE UNIQUE INDEX products_reference_active_key
  ON products (lower(reference))
  WHERE archived_at IS NULL AND reference IS NOT NULL;

-- One active client per ICE: an ICE names one establishment
CREATE UNIQUE INDEX clients_ice_active_key
  ON clients (ice)
  WHERE archived_at IS NULL AND ice IS NOT NULL;
