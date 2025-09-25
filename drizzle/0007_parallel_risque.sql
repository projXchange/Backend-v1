DROP TABLE "projects_dump" CASCADE;--> statement-breakpoint
DROP TABLE "users_dump" CASCADE;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "thumbnail" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "images" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "demo_video" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "features" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "tags" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "files" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "requirements" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "stats" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "rating" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rating" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_sales" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_purchases" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "experience_level" "user_experience_level_enum" DEFAULT 'beginner' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "website" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "skills" text[] DEFAULT '{}' NOT NULL;