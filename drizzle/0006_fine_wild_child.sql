CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price_at_time" numeric(10, 2) NOT NULL,
	"currency" "currency_enum" DEFAULT 'INR' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "downloads" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"download_type" varchar(50) DEFAULT 'full' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"key_features" text,
	"category" "category_enum" DEFAULT 'web_development' NOT NULL,
	"author_id" uuid NOT NULL,
	"buyers" uuid[] DEFAULT '{}',
	"difficulty_level" "difficulty_enum" DEFAULT 'beginner' NOT NULL,
	"tech_stack" text[] DEFAULT '{}' NOT NULL,
	"github_url" varchar(255),
	"demo_url" varchar(255),
	"documentation" text,
	"pricing" jsonb,
	"delivery_time" integer DEFAULT 0 NOT NULL,
	"status" "project_status_enum" DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"purchase_count" integer DEFAULT 0 NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects_dump" (
	"id" uuid PRIMARY KEY NOT NULL,
	"thumbnail" text,
	"images" text[] DEFAULT '{}',
	"demo_video" text,
	"features" text[] DEFAULT '{}',
	"tags" text[] DEFAULT '{}',
	"files" jsonb,
	"requirements" jsonb,
	"stats" jsonb,
	"rating" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"is_verified_purchase" boolean DEFAULT false NOT NULL,
	"is_approved" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"transaction_id" varchar(100) NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"type" "transaction_type_enum" DEFAULT 'purchase' NOT NULL,
	"status" "transaction_status_enum" DEFAULT 'pending' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" "currency_enum" DEFAULT 'INR' NOT NULL,
	"payment_method" varchar(50),
	"payment_gateway_response" jsonb,
	"commission_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"seller_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"metadata" jsonb,
	"processed_at" timestamp,
	"refunded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects_dump" ADD CONSTRAINT "projects_dump_id_projects_id_fk" FOREIGN KEY ("id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_carts_user_project" ON "carts" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_carts_user_id" ON "carts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_carts_created_at" ON "carts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_downloads_user_id" ON "downloads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_downloads_project_id" ON "downloads" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_downloads_created_at" ON "downloads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_projects_title" ON "projects" USING btree ("title");--> statement-breakpoint
CREATE INDEX "idx_projects_category" ON "projects" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_projects_author_id" ON "projects" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_projects_status" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_projects_is_featured" ON "projects" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "idx_projects_created_at" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reviews_user_project" ON "reviews" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_project_id" ON "reviews" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_rating" ON "reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "idx_reviews_verified_purchase" ON "reviews" USING btree ("is_verified_purchase");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_transactions_transaction_id" ON "transactions" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_user_id" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_project_id" ON "transactions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_seller_id" ON "transactions" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_status" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_transactions_type" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_transactions_created_at" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_wishlists_user_project" ON "wishlists" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX "idx_wishlists_user_id" ON "wishlists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_wishlists_project_id" ON "wishlists" USING btree ("project_id");