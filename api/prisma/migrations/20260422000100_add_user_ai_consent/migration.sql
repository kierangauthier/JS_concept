-- V2 — Per-user opt-in for AI features. Any call to the AI services must
-- check `aiProcessingConsent = true` before sending user content to an
-- external LLM (Anthropic / US transfer).

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aiProcessingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aiProcessingConsentAt" TIMESTAMP(3);
