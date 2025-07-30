import { pgEnum } from "drizzle-orm/pg-core";

export const userTypeEnum = pgEnum("user_type_enum", ["buyer", "seller"]);

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