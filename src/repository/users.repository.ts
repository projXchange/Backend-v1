import { eq, and, gt } from "drizzle-orm";
import { users } from "../models/schema";
import db from "./db";

class UserRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserRepositoryError";
  }
}

class UserNotFoundError extends UserRepositoryError {
  constructor(message = "User not found") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name?: string;
  user_type?: "buyer" | "seller";
}

export interface UpdateUserData {
  email?: string;
  full_name?: string;
  password?: string;
  user_type?: "buyer" | "seller";
  verification_status?: "pending" | "verified" | "rejected";
  last_login?: Date;
  email_verified?: boolean;
  forgot_password_token?: string | null;
  forgot_password_expiry?: Date | null;
}

export const findByEmail = async (email: string) => {
  try {
    if (!email || typeof email !== "string") {
      throw new UserRepositoryError("Invalid email parameter");
    }
    return await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
  } catch (error) {
    if (error instanceof UserRepositoryError) throw error;
    throw new UserRepositoryError(`Failed to find user by email: ${error}`);
  }
};

export const findById = async (id: string) => {
  try {
    if (!id || typeof id !== "string") {
      throw new UserRepositoryError("Invalid user ID parameter");
    }
    const result = await db.select().from(users).where(eq(users.id, id));
    if (!result.length) {
      throw new UserNotFoundError(`User with ID ${id} not found`);
    }
    return result;
  } catch (error) {
    if (error instanceof UserRepositoryError) throw error;
    throw new UserRepositoryError(`Failed to find user by ID: ${error}`);
  }
};

export const createUser = async (userData: CreateUserData) => {
  try {
    if (!userData.email || !userData.password) {
      throw new UserRepositoryError("Missing required fields: email, password");
    }
    const normalizedData = {
      ...userData,
      email: userData.email.toLowerCase().trim(),
    };
    const result = await db.insert(users).values(normalizedData).returning();
    if (!result.length) {
      throw new UserRepositoryError("Failed to create user - no result returned");
    }
    return result;
  } catch (error: any) {
    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        throw new UserRepositoryError("Email already exists");
      }
    }
    if (error instanceof UserRepositoryError) throw error;
    throw new UserRepositoryError(`Failed to create user: ${error.message}`);
  }
};

export const updateUser = async (id: string, updateObj: UpdateUserData) => {
  try {
    if (!id || typeof id !== "string") {
      throw new UserRepositoryError("Invalid user ID parameter");
    }
    if (!updateObj || Object.keys(updateObj).length === 0) {
      throw new UserRepositoryError("No update data provided");
    }
    const normalizedUpdate = { ...updateObj };
    if (normalizedUpdate.email) {
      normalizedUpdate.email = normalizedUpdate.email.toLowerCase().trim();
    }
    const result = await db.update(users)
      .set(normalizedUpdate)
      .where(eq(users.id, id))
      .returning();
    if (!result.length) {
      throw new UserNotFoundError(`User with ID ${id} not found or no changes made`);
    }
    return result;
  } catch (error: any) {
    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        throw new UserRepositoryError("Email already exists");
      }
    }
    if (error instanceof UserRepositoryError) throw error;
    throw new UserRepositoryError(`Failed to update user: ${error.message}`);
  }
};

export const findByForgotToken = async (token: string) => {
  try {
    if (!token || typeof token !== "string") {
      throw new UserRepositoryError("Invalid token parameter");
    }
    return await db.select()
      .from(users)
      .where(
        and(
          eq(users.forgot_password_token, token),
          gt(users.forgot_password_expiry, new Date())
        )
      );
  } catch (error) {
    if (error instanceof UserRepositoryError) throw error;
    throw new UserRepositoryError(`Failed to find user by forgot token: ${error}`);
  }
};

export const checkEmailExists = async (email: string): Promise<boolean> => {
  const result = await findByEmail(email);
  return result.length > 0;
};

export { UserRepositoryError, UserNotFoundError };
