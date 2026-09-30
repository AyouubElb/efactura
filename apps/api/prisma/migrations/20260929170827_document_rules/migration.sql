-- CreateIndex
CREATE INDEX "invoice_lines_invoice_id_idx" ON "invoice_lines"("invoice_id");

-- CreateIndex
CREATE INDEX "purchase_lines_purchase_id_idx" ON "purchase_lines"("purchase_id");

-- CreateIndex
CREATE INDEX "quote_lines_quote_id_idx" ON "quote_lines"("quote_id");

-- ============================================================================
-- Written by hand: a document's status only makes the moves the app allows
-- ============================================================================
-- The freeze used to refuse only a return to draft, so a direct SQL query
-- could bring a cancelled invoice back to sent. Each status now lists where
-- it may go:
--
--   invoices  draft → sent → paid or cancelled; paid → sent undoes a payment
--   quotes    draft → sent → accepted, refused or replaced
--
-- The frozen columns are the same as in frozen_documents, and its rule still
-- holds: a column added to these tables is frozen here or named as allowed.
-- ============================================================================

CREATE OR REPLACE FUNCTION invoices_refuse_frozen_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'Invoice % is sent: it can never be deleted', OLD.number
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.status <> OLD.status AND (OLD.status::text, NEW.status::text) NOT IN (
       ('draft', 'sent'), ('sent', 'paid'), ('sent', 'cancelled'), ('paid', 'sent')
  ) THEN
    RAISE EXCEPTION 'Invoice % can''t go from % to %',
      coalesce(OLD.number, OLD.id::text), OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status <> 'draft' AND (
       NEW.number             IS DISTINCT FROM OLD.number
    OR NEW.client_id          IS DISTINCT FROM OLD.client_id
    OR NEW.quote_id           IS DISTINCT FROM OLD.quote_id
    OR NEW.issue_date         IS DISTINCT FROM OLD.issue_date
    OR NEW.due_date           IS DISTINCT FROM OLD.due_date
    OR NEW.client_snapshot    IS DISTINCT FROM OLD.client_snapshot
    OR NEW.shop_snapshot      IS DISTINCT FROM OLD.shop_snapshot
    OR NEW.total_ht_centimes  IS DISTINCT FROM OLD.total_ht_centimes
    OR NEW.total_tva_centimes IS DISTINCT FROM OLD.total_tva_centimes
    OR NEW.total_ttc_centimes IS DISTINCT FROM OLD.total_ttc_centimes
    OR NEW.tva_breakdown      IS DISTINCT FROM OLD.tva_breakdown
    OR NEW.total_in_words     IS DISTINCT FROM OLD.total_in_words
    OR NEW.notes              IS DISTINCT FROM OLD.notes
    OR (OLD.pdf_key IS NOT NULL AND NEW.pdf_key IS DISTINCT FROM OLD.pdf_key)   -- set once
  ) THEN
    RAISE EXCEPTION 'Invoice % is sent: it can no longer change', OLD.number
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

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
    OR (OLD.pdf_key IS NOT NULL AND NEW.pdf_key IS DISTINCT FROM OLD.pdf_key)  -- set once
  ) THEN
    RAISE EXCEPTION 'Quote % is sent: it can no longer change', OLD.number
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
