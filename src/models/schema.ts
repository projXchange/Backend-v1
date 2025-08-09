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
  uniqueIndex
} from "drizzle-orm/pg-core";
import { experienceLevelEnum, userTypeEnum, verificationStatusEnum, userStatusEnum } from "../constants/users";
import { sql } from "drizzle-orm";

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
  },
  (users) => {
    return {
      email_idx: uniqueIndex("idx_users_email").on(users.email),
    };
  },
);

export const users_dump = pgTable(
  "users_dump",
  {
    id: uuid("id").primaryKey().notNull().references(() => users.id),
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
    status: userStatusEnum("status").notNull().default("active"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    deleted_at: timestamp("deleted_at"),
  }
);
