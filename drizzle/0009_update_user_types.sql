-- Update user_type_enum to only include user, admin, manager
-- First, add the new enum values to the existing enum
ALTER TYPE "user_type_enum" ADD VALUE IF NOT EXISTS 'user';

-- Note: No need to update existing data as 'buyer' and 'seller' values don't exist
-- The current data already uses 'user', 'admin' values which are valid

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

-- Note: The transactions table already has author_id and author_amount columns
-- No need to rename seller_id/seller_amount as they don't exist
-- The schema is already up to date with the correct column names
