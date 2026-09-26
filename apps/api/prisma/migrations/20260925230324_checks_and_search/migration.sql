-- ============================================================================
-- checks_and_search — rules the database enforces, and typo-tolerant search
-- ============================================================================
-- The CHECKs repeat rules the API already applies: they are the net under it.
-- A search query must use the exact expression of its index, for example
-- lower(f_unaccent(name)), or PostgreSQL ignores the index.
-- Change an index here and the matching query in the same commit.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- similarity of 3-letter pieces of text
CREATE EXTENSION IF NOT EXISTS unaccent;  -- "Câble" becomes "Cable"

-- unaccent is not IMMUTABLE, so PostgreSQL refuses it inside an index.
-- This wrapper fixes the dictionary, which makes it safe to mark IMMUTABLE.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- search: catalogue, clients, closest supplier names
CREATE INDEX products_name_trgm
  ON products USING gin (lower(f_unaccent(name)) gin_trgm_ops);
CREATE INDEX products_reference_trgm
  ON products USING gin (lower(f_unaccent(coalesce(reference, ''))) gin_trgm_ops);
CREATE INDEX clients_name_trgm
  ON clients USING gin (lower(f_unaccent(name)) gin_trgm_ops);

-- one settings row
ALTER TABLE shop_settings ADD CONSTRAINT shop_settings_single_row CHECK (id = 1);

-- clients and suppliers
ALTER TABLE clients   ADD CONSTRAINT clients_company_has_ice CHECK (type = 'individual' OR ice IS NOT NULL);
ALTER TABLE clients   ADD CONSTRAINT clients_ice_format      CHECK (ice IS NULL OR ice ~ '^[0-9]{15}$');
ALTER TABLE clients   ADD CONSTRAINT clients_payment_days    CHECK (payment_days BETWEEN 0 AND 120);  -- law 69-21
ALTER TABLE suppliers ADD CONSTRAINT suppliers_ice_format    CHECK (ice IS NULL OR ice ~ '^[0-9]{15}$');

-- money
ALTER TABLE products     ADD CONSTRAINT products_price_not_negative CHECK (price_ht_centimes >= 0);
ALTER TABLE quotes       ADD CONSTRAINT quotes_totals_add_up        CHECK (total_ttc_centimes = total_ht_centimes + total_tva_centimes);
ALTER TABLE invoices     ADD CONSTRAINT invoices_totals_add_up      CHECK (total_ttc_centimes = total_ht_centimes + total_tva_centimes);
ALTER TABLE credit_notes ADD CONSTRAINT credit_notes_negative       CHECK (total_ttc_centimes <= 0
                                                                           AND total_ttc_centimes = total_ht_centimes + total_tva_centimes);

-- statuses
ALTER TABLE invoices ADD CONSTRAINT invoices_sent_has_number  CHECK (status = 'draft' OR number IS NOT NULL);
ALTER TABLE quotes   ADD CONSTRAINT quotes_sent_has_number    CHECK (status = 'draft' OR number IS NOT NULL);
ALTER TABLE invoices ADD CONSTRAINT invoices_paid_has_payment CHECK (status <> 'paid'
                                                                     OR (paid_on IS NOT NULL AND payment_method IS NOT NULL));

-- a supplier invoice is confirmed once per supplier, number and year
-- partial: failed or discarded uploads never block a later one
CREATE UNIQUE INDEX purchase_invoices_supplier_number_year
  ON purchase_invoices (supplier_id, supplier_invoice_number, invoice_year)
  WHERE status = 'confirmed';
