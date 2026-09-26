-- ============================================================================
-- frozen_documents — sent documents can never change
-- ============================================================================
-- Moroccan law: a sent invoice is final. The API refuses the change first;
-- these triggers are the net under it, even for a direct SQL query.
--
-- The triggers name the frozen columns one by one. When a column is added
-- to invoices, quotes or credit_notes, decide whether it is frozen and update
-- the trigger IN THE SAME MIGRATION. A forgotten column is not protected.
--
-- Still allowed after sending: the status moving forward, the payment
-- details, pdf_key the first time, the delivery details, updated_at.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------

CREATE FUNCTION invoices_refuse_frozen_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'Invoice % is sent: it can never be deleted', OLD.number
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status <> 'draft' AND (
       NEW.status = 'draft'                                       -- never back to draft
    OR NEW.number             IS DISTINCT FROM OLD.number
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

CREATE TRIGGER invoices_frozen
  BEFORE UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION invoices_refuse_frozen_change();

CREATE FUNCTION invoice_lines_refuse_when_sent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_status text;
BEGIN
  SELECT status::text INTO parent_status
    FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  -- parent_status is NULL while a draft is deleted together with its lines: allowed
  IF parent_status IS NOT NULL AND parent_status <> 'draft' THEN
    RAISE EXCEPTION 'The lines of a sent invoice can no longer change'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER invoice_lines_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON invoice_lines
  FOR EACH ROW EXECUTE FUNCTION invoice_lines_refuse_when_sent();

-- ---------------------------------------------------------------------------
-- quotes: the invoice list without payment; valid_until may still be extended
-- ---------------------------------------------------------------------------

CREATE FUNCTION quotes_refuse_frozen_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'Quote % is sent: it can never be deleted', OLD.number
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status <> 'draft' AND (
       NEW.status = 'draft'                                       -- never back to draft
    OR NEW.number              IS DISTINCT FROM OLD.number
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

CREATE TRIGGER quotes_frozen
  BEFORE UPDATE OR DELETE ON quotes
  FOR EACH ROW EXECUTE FUNCTION quotes_refuse_frozen_change();

CREATE FUNCTION quote_lines_refuse_when_sent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_status text;
BEGIN
  SELECT status::text INTO parent_status
    FROM quotes WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  -- parent_status is NULL while a draft is deleted together with its lines: allowed
  IF parent_status IS NOT NULL AND parent_status <> 'draft' THEN
    RAISE EXCEPTION 'The lines of a sent quote can no longer change'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER quote_lines_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON quote_lines
  FOR EACH ROW EXECUTE FUNCTION quote_lines_refuse_when_sent();

-- ---------------------------------------------------------------------------
-- credit_notes: sent at creation, so frozen from the first second
-- ---------------------------------------------------------------------------

CREATE FUNCTION credit_notes_refuse_frozen_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Avoir % can never be deleted', OLD.number
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.number             IS DISTINCT FROM OLD.number
    OR NEW.invoice_id         IS DISTINCT FROM OLD.invoice_id
    OR NEW.reason             IS DISTINCT FROM OLD.reason
    OR NEW.client_snapshot    IS DISTINCT FROM OLD.client_snapshot
    OR NEW.shop_snapshot      IS DISTINCT FROM OLD.shop_snapshot
    OR NEW.total_ht_centimes  IS DISTINCT FROM OLD.total_ht_centimes
    OR NEW.total_tva_centimes IS DISTINCT FROM OLD.total_tva_centimes
    OR NEW.total_ttc_centimes IS DISTINCT FROM OLD.total_ttc_centimes
    OR NEW.total_in_words     IS DISTINCT FROM OLD.total_in_words
    OR NEW.created_by_id      IS DISTINCT FROM OLD.created_by_id
    OR NEW.created_at         IS DISTINCT FROM OLD.created_at
    OR (OLD.pdf_key IS NOT NULL AND NEW.pdf_key IS DISTINCT FROM OLD.pdf_key)   -- set once
  THEN
    RAISE EXCEPTION 'Avoir % can no longer change', OLD.number
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER credit_notes_frozen
  BEFORE UPDATE OR DELETE ON credit_notes
  FOR EACH ROW EXECUTE FUNCTION credit_notes_refuse_frozen_change();
