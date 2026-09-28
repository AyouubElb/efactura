-- AlterTable
ALTER TABLE "one_time_tokens" ADD COLUMN     "email_failed_at" TIMESTAMP(3),
ADD COLUMN     "email_sent_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "one_time_tokens_user_id_purpose_idx" ON "one_time_tokens"("user_id", "purpose");
