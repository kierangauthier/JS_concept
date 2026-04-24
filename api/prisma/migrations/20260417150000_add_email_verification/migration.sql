-- A3 security fix: email ownership verification
--
-- 1. Records when an account proved ownership of its email address.
-- 2. Adds the token table (SHA-256 hash, single-use, cascade on user delete).

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- Grandfather existing users: any user created before this migration is
-- assumed to have been verified out-of-band (by the admin who created them).
UPDATE "users" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id"        TEXT         NOT NULL,
  "tokenHash" TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_tokenHash_key"
  ON "email_verification_tokens" ("tokenHash");
CREATE INDEX IF NOT EXISTS "email_verification_tokens_userId_idx"
  ON "email_verification_tokens" ("userId");

ALTER TABLE "email_verification_tokens"
  ADD CONSTRAINT "email_verification_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
