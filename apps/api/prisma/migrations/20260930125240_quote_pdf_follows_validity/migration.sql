-- ============================================================================
-- quote_pdf_follows_validity — "Prolonger" makes a new quote PDF
-- ============================================================================
-- A quote's PDF prints its validity date. When the date is extended, the kept
-- PDF would show the old one, so a quote's pdf_key may change, but only in the
-- same update as valid_until. The old file stays in storage.
--
-- Invoices and avoirs keep "pdf_key set once": they are never remade.
-- Everything else is the same as in document_rules.
-- ============================================================================

CREATE OR REPLACE FUNCTION quotes_refuse_frozen_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'Quote % is sent: it can never be deleted', OLD.number
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.status <> OLD.status AND (OLD.status::text, NEW.status::text) NOT IN (
       ('draft', 'sent'), ('sent', 'accepted'), ('sent', 'refused'), ('sent', 'replaced')
  ) THEN
    RAISE EXCEPTION 'Quote % can''t go from % to %',
      coalesce(OLD.number, OLD.id::text), OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status <> 'draft' AND (
       NEW.number              IS DISTINCT FROM OLD.number
    OR NEW.version             IS DISTINCT FROM OLD.version
    OR NEW.previous_version_id IS DISTINCT FROM OLD.previous_version_id
    OR NEW.client_id           IS DISTINCT FROM OLD.client_id
    OR NEW.issue_date          IS DISTINCT FROM OLD.issue_date
    OR NEW.client_snapshot     IS DISTINCT FROM OLD.client_snapshot
    OR NEW.shop_snapshot       IS DISTINCT FROM OLD.shop_snapshot
    OR NEW.total_ht_centimes   IS DISTINCT FROM OLD.total_ht_centimes
    OR NEW.total_tva_centimes  IS DISTINCT FROM OLD.total_tva_centimes
    OR NEW.total_ttc_centimes  IS DISTINCT FROM OLD.total_ttc_centimes
    OR NEW.tva_breakdown       IS DISTINCT FROM OLD.tva_breakdown
    OR NEW.total_in_words      IS DISTINCT FROM OLD.total_in_words
    OR NEW.notes               IS DISTINCT FROM OLD.notes
    -- set once, unless the validity date changes in the same update
    OR (OLD.pdf_key IS NOT NULL AND NEW.pdf_key IS DISTINCT FROM OLD.pdf_key
        AND NEW.valid_until IS NOT DISTINCT FROM OLD.valid_until)
  ) THEN
    RAISE EXCEPTION 'Quote % is sent: it can no longer change', OLD.number
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
