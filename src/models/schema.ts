import {
  pgTable,
  serial,
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


export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    password: varchar("password", { length: 128 }).notNull(),
    username: varchar("username", { length: 50 }).notNull(),
    full_name: varchar("full_name", { length: 100 }),
    avatar: text("avatar").notNull(),
    bio: text("bio").notNull(),
    location: varchar("location", { length: 100 }).notNull(),
    website: varchar("website", { length: 255 }).notNull(),
    social_links: jsonb("social_links").notNull(),
    user_type: userTypeEnum("user_type").notNull().default("buyer"),
    verification_status: verificationStatusEnum("verification_status").notNull().default("pending"),
    rating: real("rating").notNull().default(0),
    total_sales: integer("total_sales").notNull().default(0),
    total_purchases: integer("total_purchases").notNull().default(0), 
    skills: text("skills").array().notNull().default([]),
    experience_level: experienceLevelEnum("experience_level").notNull().default("beginner"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
    last_login: timestamp("last_login").notNull().defaultNow(),
    email_verified: boolean("email_verified").notNull().default(false),
  },
  (users) => {
    return {
      email_idx: uniqueIndex("idx_users_email").on(users.email),
      username_idx: uniqueIndex("idx_users_username").on(users.username)
    };
  },
);