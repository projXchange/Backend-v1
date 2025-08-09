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
import { experienceLevelEnum, userTypeEnum, verificationStatusEnum } from "../constants/users";
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
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    last_login: timestamp("last_login").notNull().defaultNow(),
    email_verified: boolean("email_verified").notNull().default(false),
    forgot_password_token: varchar("forgot_password_token", { length: 128 }),
    forgot_password_expiry: timestamp("forgot_password_expiry"),
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
    avatar: text("avatar").notNull(),
    bio: text("bio").notNull(),
    location: varchar("location", { length: 100 }).notNull(),
    website: varchar("website", { length: 255 }).notNull(),
    social_links: jsonb("social_links").notNull(),
    skills: text("skills").array().notNull().default([]),
  }
);
