CREATE TYPE user_type_enum AS ENUM ('buyer', 'seller');
CREATE TYPE user_verification_status_enum AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE user_experience_level_enum AS ENUM ('beginner', 'intermediate', 'expert');

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"password" varchar(128) NOT NULL,
	"username" varchar(50) NOT NULL,
	"full_name" varchar(100),
	"avatar" text NOT NULL,
	"bio" text NOT NULL,
	"location" varchar(100) NOT NULL,
	"website" varchar(255) NOT NULL,
	"social_links" jsonb NOT NULL,
	"user_type" "user_type_enum" DEFAULT 'buyer' NOT NULL,
	"verification_status" "user_verification_status_enum" DEFAULT 'pending' NOT NULL,
	"rating" real DEFAULT 0 NOT NULL,
	"total_sales" integer DEFAULT 0 NOT NULL,
	"total_purchases" integer DEFAULT 0 NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"experience_level" "user_experience_level_enum" DEFAULT 'beginner' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login" timestamp DEFAULT now() NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL
);

CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");
CREATE UNIQUE INDEX "idx_users_username" ON "users" USING btree ("username");


