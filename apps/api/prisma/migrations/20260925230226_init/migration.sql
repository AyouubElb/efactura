-- CreateEnum
CREATE TYPE "role" AS ENUM ('admin', 'staff');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('invited', 'active', 'off');

-- CreateEnum
CREATE TYPE "token_purpose" AS ENUM ('invite', 'reset');

-- CreateEnum
CREATE TYPE "client_type" AS ENUM ('company', 'individual');

-- CreateEnum
CREATE TYPE "series" AS ENUM ('FA', 'DV', 'AV');

-- CreateEnum
CREATE TYPE "quote_status" AS ENUM ('draft', 'sent', 'accepted', 'refused', 'replaced');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('draft', 'sent', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "purchase_status" AS ENUM ('uploaded', 'reading', 'ready', 'confirmed', 'failed', 'discarded');

-- CreateEnum
CREATE TYPE "match_method" AS ENUM ('saved_name', 'reference', 'closest_name', 'manual', 'new_product');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('cash', 'cheque', 'transfer', 'card', 'effet');

-- CreateEnum
CREATE TYPE "send_channel" AS ENUM ('whatsapp', 'email', 'download');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('quote', 'invoice', 'credit_note');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "role" NOT NULL DEFAULT 'staff',
    "status" "user_status" NOT NULL DEFAULT 'invited',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_time_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "token_purpose" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "legal_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "ice" CHAR(15) NOT NULL,
    "if_number" TEXT NOT NULL,
    "tp_number" TEXT NOT NULL,
    "rc_number" TEXT NOT NULL,
    "rc_city" TEXT NOT NULL,
    "bank_name" TEXT,
    "rib" CHAR(24),
    "logo_key" TEXT,
    "default_payment_days" INTEGER NOT NULL DEFAULT 60,
    "default_quote_validity_days" INTEGER NOT NULL DEFAULT 30,
    "price_rise_threshold_percent" INTEGER NOT NULL DEFAULT 10,
    "tva_rates_bp" INTEGER[] DEFAULT ARRAY[2000, 1000, 0]::INTEGER[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "number_counters" (
    "series" "series" NOT NULL,
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "number_counters_pkey" PRIMARY KEY ("series","year")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "type" "client_type" NOT NULL,
    "name" TEXT NOT NULL,
    "ice" CHAR(15),
    "address" TEXT,
    "city" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "payment_days" INTEGER NOT NULL DEFAULT 60,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ice" CHAR(15),
    "if_number" TEXT,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pièce',
    "price_ht_centimes" INTEGER NOT NULL,
    "tva_rate_bp" INTEGER NOT NULL,
    "last_cost_ht_centimes" INTEGER,
    "last_cost_at" TIMESTAMP(3),
    "last_supplier_id" UUID,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_product_names" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "label_raw" TEXT NOT NULL,
    "label_key" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "times_confirmed" INTEGER NOT NULL DEFAULT 1,
    "last_confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_product_names_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoices" (
    "id" UUID NOT NULL,
    "status" "purchase_status" NOT NULL DEFAULT 'uploaded',
    "file_key" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "page_count" INTEGER,
    "file_sha256" CHAR(64) NOT NULL,
    "proposal" JSONB,
    "review_draft" JSONB,
    "ai_model" TEXT,
    "ai_input_tokens" INTEGER,
    "ai_output_tokens" INTEGER,
    "ai_cost_micro_usd" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "uploaded_by_id" UUID NOT NULL,
    "supplier_id" UUID,
    "supplier_invoice_number" TEXT,
    "invoice_date" DATE,
    "invoice_year" INTEGER,
    "total_ht_centimes" INTEGER,
    "total_tva_centimes" INTEGER,
    "total_ttc_centimes" INTEGER,
    "confirmed_by_id" UUID,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_lines" (
    "id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "label_raw" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "match_method" "match_method" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_cost_ht_centimes" INTEGER NOT NULL,
    "line_total_ht_centimes" INTEGER NOT NULL,
    "tva_rate_bp" INTEGER NOT NULL,
    "previous_cost_ht_centimes" INTEGER,

    CONSTRAINT "purchase_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "number" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previous_version_id" UUID,
    "status" "quote_status" NOT NULL DEFAULT 'draft',
    "client_id" UUID NOT NULL,
    "issue_date" DATE,
    "valid_until" DATE,
    "client_snapshot" JSONB,
    "shop_snapshot" JSONB,
    "total_ht_centimes" INTEGER NOT NULL DEFAULT 0,
    "total_tva_centimes" INTEGER NOT NULL DEFAULT 0,
    "total_ttc_centimes" INTEGER NOT NULL DEFAULT 0,
    "tva_breakdown" JSONB,
    "total_in_words" TEXT,
    "pdf_key" TEXT,
    "sent_via" "send_channel",
    "sent_at" TIMESTAMP(3),
    "sent_by_id" UUID,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_lines" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "product_id" UUID,
    "label" TEXT NOT NULL,
    "reference" TEXT,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price_ht_centimes" INTEGER NOT NULL,
    "tva_rate_bp" INTEGER NOT NULL,
    "line_total_ht_centimes" INTEGER NOT NULL,

    CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "number" TEXT,
    "status" "invoice_status" NOT NULL DEFAULT 'draft',
    "client_id" UUID NOT NULL,
    "quote_id" UUID,
    "issue_date" DATE,
    "due_date" DATE,
    "client_snapshot" JSONB,
    "shop_snapshot" JSONB,
    "total_ht_centimes" INTEGER NOT NULL DEFAULT 0,
    "total_tva_centimes" INTEGER NOT NULL DEFAULT 0,
    "total_ttc_centimes" INTEGER NOT NULL DEFAULT 0,
    "tva_breakdown" JSONB,
    "total_in_words" TEXT,
    "pdf_key" TEXT,
    "sent_via" "send_channel",
    "sent_at" TIMESTAMP(3),
    "sent_by_id" UUID,
    "paid_on" DATE,
    "payment_method" "payment_method",
    "payment_reference" TEXT,
    "paid_recorded_by_id" UUID,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "product_id" UUID,
    "label" TEXT NOT NULL,
    "reference" TEXT,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price_ht_centimes" INTEGER NOT NULL,
    "tva_rate_bp" INTEGER NOT NULL,
    "line_total_ht_centimes" INTEGER NOT NULL,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "invoice_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "client_snapshot" JSONB NOT NULL,
    "shop_snapshot" JSONB NOT NULL,
    "total_ht_centimes" INTEGER NOT NULL,
    "total_tva_centimes" INTEGER NOT NULL,
    "total_ttc_centimes" INTEGER NOT NULL,
    "total_in_words" TEXT NOT NULL,
    "pdf_key" TEXT,
    "sent_via" "send_channel",
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "document_type" "document_type" NOT NULL,
    "document_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "last_opened_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_tokens_token_hash_key" ON "one_time_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_ice_key" ON "suppliers"("ice");

-- CreateIndex
CREATE INDEX "products_reference_idx" ON "products"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_product_names_supplier_id_label_key_key" ON "supplier_product_names"("supplier_id", "label_key");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_file_sha256_key" ON "purchase_invoices"("file_sha256");

-- CreateIndex
CREATE INDEX "purchase_invoices_status_idx" ON "purchase_invoices"("status");

-- CreateIndex
CREATE INDEX "purchase_invoices_invoice_date_idx" ON "purchase_invoices"("invoice_date");

-- CreateIndex
CREATE INDEX "purchase_lines_product_id_idx" ON "purchase_lines"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_previous_version_id_key" ON "quotes"("previous_version_id");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quotes_client_id_idx" ON "quotes"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_number_version_key" ON "quotes"("number", "version");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_quote_id_key" ON "invoices"("quote_id");

-- CreateIndex
CREATE INDEX "invoices_status_due_date_idx" ON "invoices"("status", "due_date");

-- CreateIndex
CREATE INDEX "invoices_paid_on_idx" ON "invoices"("paid_on");

-- CreateIndex
CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_number_key" ON "credit_notes"("number");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_invoice_id_key" ON "credit_notes"("invoice_id");

-- CreateIndex
CREATE INDEX "activity_log_entity_type_entity_id_idx" ON "activity_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_log_created_at_idx" ON "activity_log"("created_at");

-- CreateIndex
CREATE INDEX "activity_log_user_id_created_at_idx" ON "activity_log"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_hash_key" ON "share_links"("token_hash");

-- CreateIndex
CREATE INDEX "share_links_document_type_document_id_idx" ON "share_links"("document_type", "document_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_time_tokens" ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_last_supplier_id_fkey" FOREIGN KEY ("last_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_product_names" ADD CONSTRAINT "supplier_product_names_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_product_names" ADD CONSTRAINT "supplier_product_names_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchase_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_lines" ADD CONSTRAINT "purchase_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paid_recorded_by_id_fkey" FOREIGN KEY ("paid_recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
