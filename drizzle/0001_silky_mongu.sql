CREATE TABLE "users_dump" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rating" real DEFAULT 0 NOT NULL,
	"total_sales" integer DEFAULT 0 NOT NULL,
	"total_purchases" integer DEFAULT 0 NOT NULL,
	"experience_level" "user_experience_level_enum" DEFAULT 'beginner' NOT NULL,
	"avatar" text NOT NULL,
	"bio" text NOT NULL,
	"location" varchar(100) NOT NULL,
	"website" varchar(255) NOT NULL,
	"social_links" jsonb NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL
);

DROP INDEX "idx_users_username";
ALTER TABLE "users_dump" ADD CONSTRAINT "users_dump_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "users" DROP COLUMN "avatar";
ALTER TABLE "users" DROP COLUMN "bio";
ALTER TABLE "users" DROP COLUMN "location";
ALTER TABLE "users" DROP COLUMN "website";
ALTER TABLE "users" DROP COLUMN "social_links";
ALTER TABLE "users" DROP COLUMN "rating";
ALTER TABLE "users" DROP COLUMN "total_sales";
ALTER TABLE "users" DROP COLUMN "total_purchases";
ALTER TABLE "users" DROP COLUMN "skills";
ALTER TABLE "users" DROP COLUMN "experience_level";