// models/schema.ts
import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  real,
  timestamp,
  uuid,
  jsonb,
  uniqueIndex,
  foreignKey,
  index,
  decimal
} from "drizzle-orm/pg-core";
import { experienceLevelEnum, userTypeEnum, verificationStatusEnum, userStatusEnum } from "../constants/users";
import { sql } from "drizzle-orm";
import { difficultyEnum, projectStatusEnum, categoryEnum, currencyEnum, transactionStatusEnum, transactionTypeEnum } from "../constants/projects";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_generate_v4()`),
    email: varchar("email", { length: 320 }).notNull(),
    full_name: varchar("full_name", { length: 100 }),
    password: varchar("password", { length: 128 }).notNull(),
    user_type: userTypeEnum("user_type").notNull().default("buyer"),
    verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
    status: userStatusEnum("status").notNull().default("active"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    last_login: timestamp("last_login").notNull().defaultNow(),
    email_verified: boolean("email_verified").notNull().default(false),
    forgot_password_token: varchar("forgot_password_token", { length: 128 }),
    forgot_password_expiry: timestamp("forgot_password_expiry"),
    deleted_at: timestamp("deleted_at"),
    rating: real("rating").notNull().default(0),
    total_sales: integer("total_sales").notNull().default(0),
    total_purchases: integer("total_purchases").notNull().default(0), 
    experience_level: experienceLevelEnum("experience_level").notNull().default("beginner"),
    avatar: text("avatar"),
    bio: text("bio"),
    location: varchar("location", { length: 100 }),
    website: varchar("website", { length: 255 }),
    social_links: jsonb("social_links"),
    skills: text("skills").array().notNull().default([]),
  },
  (users) => {
    return {
      email_idx: uniqueIndex("idx_users_email").on(users.email),
    };
  },
);


export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().notNull().default(sql`uuid_generate_v4()`),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  key_features: text("key_features"), // New field - detailed description/key features
  category: categoryEnum("category").notNull().default("web_development"),
  author_id: uuid("author_id").references(() => users.id).notNull(),
  buyers: uuid("buyers").array().default([]),
  difficulty_level: difficultyEnum("difficulty_level").notNull().default("beginner"),
  tech_stack: text("tech_stack").array().notNull().default([]),
  github_url: varchar("github_url", { length: 255 }),
  demo_url: varchar("demo_url", { length: 255 }),
  documentation: text("documentation"),
  pricing: jsonb("pricing").$type<{
    sale_price: number;
    original_price: number;
    currency: "INR" | "USD";
  }>(),
  delivery_time: integer("delivery_time").notNull().default(0), // in days
  status: projectStatusEnum("status").notNull().default("draft"),
  is_featured: boolean("is_featured").notNull().default(false),
  view_count: integer("view_count").notNull().default(0),
  purchase_count: integer("purchase_count").notNull().default(0),
  download_count: integer("download_count").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
  thumbnail: text("thumbnail"),
  images: text("images").array().default([]),
  demo_video: text("demo_video"),
  features: text("features").array().default([]),
  tags: text("tags").array().default([]),
  files: jsonb("files").$type<{
    source_files?: string[];
    documentation_files?: string[];
    assets?: string[];
    size_mb?: number;
  }>(),
  requirements: jsonb("requirements").$type<{
    system_requirements?: string[];
    dependencies?: string[];
    installation_steps?: string[];
  }>(),
  stats: jsonb("stats").$type<{
    total_downloads?: number;
    total_views?: number;
    total_likes?: number;
    completion_rate?: number;
  }>(),
  rating: jsonb("rating").$type<{
    average_rating?: number;
    total_ratings?: number;
    rating_distribution?: { [key: string]: number };
  }>(),
}, (table) => {
  return {
    title_idx: index("idx_projects_title").on(table.title),
    category_idx: index("idx_projects_category").on(table.category),
    author_idx: index("idx_projects_author_id").on(table.author_id),
    status_idx: index("idx_projects_status").on(table.status),
    featured_idx: index("idx_projects_is_featured").on(table.is_featured),
    created_at_idx: index("idx_projects_created_at").on(table.created_at),
  };
});


export const wishlists = pgTable("wishlists", {
  id: uuid("id").primaryKey().notNull().default(sql`uuid_generate_v4()`),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    user_project_idx: uniqueIndex("idx_wishlists_user_project").on(table.user_id, table.project_id),
    user_idx: index("idx_wishlists_user_id").on(table.user_id),
    project_idx: index("idx_wishlists_project_id").on(table.project_id),
  };
});

export const downloads = pgTable("downloads", {
  id: uuid("id").primaryKey().notNull().default(sql`uuid_generate_v4()`),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  download_type: varchar("download_type", { length: 50 }).notNull().default("full"), // "full", "demo", "preview"
  ip_address: varchar("ip_address", { length: 45 }),
  user_agent: text("user_agent"),
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    user_idx: index("idx_downloads_user_id").on(table.user_id),
    project_idx: index("idx_downloads_project_id").on(table.project_id),
    created_at_idx: index("idx_downloads_created_at").on(table.created_at),
  };
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().notNull().default(sql`uuid_generate_v4()`),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  review_text: text("review_text"),
  is_verified_purchase: boolean("is_verified_purchase").notNull().default(false),
  is_approved: boolean("is_approved").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => {
  return {
    user_project_idx: uniqueIndex("idx_reviews_user_project").on(table.user_id, table.project_id),
    project_idx: index("idx_reviews_project_id").on(table.project_id),
    rating_idx: index("idx_reviews_rating").on(table.rating),
    verified_idx: index("idx_reviews_verified_purchase").on(table.is_verified_purchase),
  };
});

// New table: Transactions (for payments and purchase history)
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().notNull().default(sql`uuid_generate_v4()`),
  transaction_id: varchar("transaction_id", { length: 100 }).notNull(), // External payment gateway transaction ID
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  seller_id: uuid("seller_id").references(() => users.id).notNull(), // Author of the project
  type: transactionTypeEnum("type").notNull().default("purchase"), // "purchase", "refund"
  status: transactionStatusEnum("status").notNull().default("pending"), // "pending", "completed", "failed", "cancelled", "refunded"
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull().default("INR"),
  payment_method: varchar("payment_method", { length: 50 }), // "razorpay", "stripe", "paypal", etc.
  payment_gateway_response: jsonb("payment_gateway_response"), // Store full response from payment gateway
  commission_amount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull().default('0'), // Platform commission
  seller_amount: decimal("seller_amount", { precision: 10, scale: 2 }).notNull().default('0'), // Amount after commission
  metadata: jsonb("metadata"), // Additional transaction data
  processed_at: timestamp("processed_at"),
  refunded_at: timestamp("refunded_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => {
  return {
    transaction_id_idx: uniqueIndex("idx_transactions_transaction_id").on(table.transaction_id),
    user_idx: index("idx_transactions_user_id").on(table.user_id),
    project_idx: index("idx_transactions_project_id").on(table.project_id),
    seller_idx: index("idx_transactions_seller_id").on(table.seller_id),
    status_idx: index("idx_transactions_status").on(table.status),
    type_idx: index("idx_transactions_type").on(table.type),
    created_at_idx: index("idx_transactions_created_at").on(table.created_at),
  };
});

// New table: Cart (temporary storage before checkout)
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().notNull().default(sql`uuid_generate_v4()`),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  quantity: integer("quantity").notNull().default(1), // Usually 1 for digital products
  price_at_time: decimal("price_at_time", { precision: 10, scale: 2 }).notNull(), // Price when added to cart
  currency: currencyEnum("currency").notNull().default("INR"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => {
  return {
    user_project_idx: uniqueIndex("idx_carts_user_project").on(table.user_id, table.project_id),
    user_idx: index("idx_carts_user_id").on(table.user_id),
    created_at_idx: index("idx_carts_created_at").on(table.created_at),
  };
});
