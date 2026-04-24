-- V5.5 — Append-only history of consent grants / revocations.
-- The boolean flags on `users` keep the current state for fast reads; this
-- table proves WHEN and FROM WHERE a consent was given/revoked.

CREATE TABLE "user_consents" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "purpose"   TEXT NOT NULL,
  "granted"   BOOLEAN NOT NULL,
  "ip"        TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_consents_userId_idx" ON "user_consents" ("userId");
CREATE INDEX "user_consents_purpose_createdAt_idx"
  ON "user_consents" ("purpose", "createdAt");

ALTER TABLE "user_consents"
  ADD CONSTRAINT "user_consents_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
