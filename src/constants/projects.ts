// constants/projects.ts
import { pgEnum } from "drizzle-orm/pg-core";

export const difficultyEnum = pgEnum("difficulty_enum", ["beginner", "intermediate", "advanced", "expert"]);

export const projectStatusEnum = pgEnum("project_status_enum", [
  "draft", "pending", "approved", "suspended", "archived"
]);

export const categoryEnum = pgEnum("category_enum", [
  "web_development",
  "mobile_development", 
  "desktop_application",
  "ai_machine_learning",
  "blockchain",
  "game_development",
  "data_science",
  "devops",
  "api_backend",
  "automation_scripts",
  "ui_ux_design",
  "other"
]);

export const currencyEnum = pgEnum("currency_enum", ["INR", "USD"]);

export const transactionStatusEnum = pgEnum("transaction_status_enum", [
  "pending", "processing", "completed", "failed", "cancelled", "refunded"
]);

export const transactionTypeEnum = pgEnum("transaction_type_enum", [
  "purchase", "refund", "commission"
]);
