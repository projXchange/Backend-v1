ALTER TABLE "users" ADD COLUMN "forgot_password_token" varchar(128);
ALTER TABLE "users" ADD COLUMN "forgot_password_expiry" timestamp;