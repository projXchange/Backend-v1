-- Update user_type_enum to only include user, admin, manager
-- First, add the new enum values to the existing enum
ALTER TYPE "user_type_enum" ADD VALUE IF NOT EXISTS 'user';

-- Update existing data to use 'user' instead of 'buyer' and 'seller'
-- Note: This will only work if 'user' value exists in the enum
UPDATE "users" SET "user_type" = 'user' WHERE "user_type" = 'buyer';
UPDATE "users" SET "user_type" = 'user' WHERE "user_type" = 'seller';

-- Drop the old enum values (this requires recreating the enum)
-- First, create a new enum with only the values we want
CREATE TYPE "user_type_enum_new" AS ENUM('user', 'admin', 'manager');

-- Drop the default constraint first
ALTER TABLE "users" ALTER COLUMN "user_type" DROP DEFAULT;

-- Update the column to use the new enum
ALTER TABLE "users" ALTER COLUMN "user_type" TYPE "user_type_enum_new" USING "user_type"::text::"user_type_enum_new";

-- Drop the old enum and rename the new one
DROP TYPE "user_type_enum";
ALTER TYPE "user_type_enum_new" RENAME TO "user_type_enum";

-- Set default to 'user'
ALTER TABLE "users" ALTER COLUMN "user_type" SET DEFAULT 'user';

-- Rename seller_id to author_id in transactions table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'seller_id') THEN
        ALTER TABLE "transactions" RENAME COLUMN "seller_id" TO "author_id";
    END IF;
END $$;

-- Rename seller_amount to author_amount in transactions table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'seller_amount') THEN
        ALTER TABLE "transactions" RENAME COLUMN "seller_amount" TO "author_amount";
    END IF;
END $$;

-- Update the index name (if it exists)
DROP INDEX IF EXISTS "idx_transactions_seller_id";
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'author_id') THEN
        CREATE INDEX IF NOT EXISTS "idx_transactions_author_id" ON "transactions" ("author_id");
    END IF;
END $$;
