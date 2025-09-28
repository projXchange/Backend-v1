import { pgEnum } from "drizzle-orm/pg-core";

export const userTypeEnum = pgEnum("user_type_enum", ["user", "admin", "manager"]);

export const verificationStatusEnum = pgEnum("user_verification_status_enum", [
  "pending",
  "verified",
  "rejected",
]);

export const experienceLevelEnum = pgEnum("user_experience_level_enum", [
  "beginner",
  "intermediate",
  "expert",
]);

export const userStatusEnum = pgEnum("user_status_enum", [
  "active",
  "inactive",
  "deleted"
]);
