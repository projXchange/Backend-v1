ALTER TABLE "transactions" RENAME COLUMN "seller_id" TO "author_id";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_seller_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "idx_transactions_seller_id";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_type" SET DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "author_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reviews_is_approved" ON "reviews" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX "idx_transactions_author_id" ON "transactions" USING btree ("author_id");--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "seller_amount";