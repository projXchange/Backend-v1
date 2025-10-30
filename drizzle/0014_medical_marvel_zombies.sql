-- Add email verification fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_token" varchar(128);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_expiry" timestamp;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS "idx_users_email_verification_token" ON "users"("email_verification_token") WHERE "email_verification_token" IS NOT NULL;

-- Set email_verified to true for all existing users to maintain backward compatibility
UPDATE "users" SET "email_verified" = true WHERE "email_verified" = false;
