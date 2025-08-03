import { eq, and, gt } from "drizzle-orm";
import { users } from "../models/schema";
import db from "./db";

// Custom error classes for better error handling
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

// Type definitions for better type safety
export interface CreateUserData {
  email: string;
  password: string;
  username: string;
  full_name?: string;
  user_type?: "buyer" | "seller";
}

export interface UpdateUserData {
  email?: string;
  full_name?: string;
  password?: string;
  username?: string;
  user_type?: "buyer" | "seller";
  verification_status?: "pending" | "verified" | "rejected";
  last_login?: Date;
  email_verified?: boolean;
  forgot_password_token?: string | null;
  forgot_password_expiry?: Date | null;
}

// Repository functions
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

export const findByUsername = async (username: string) => {
  try {
    if (!username || typeof username !== "string") {
      throw new UserRepositoryError("Invalid username parameter");
    }
    
    return await db.select().from(users).where(eq(users.username, username.toLowerCase().trim()));
  } catch (error) {
    if (error instanceof UserRepositoryError) throw error;
    throw new UserRepositoryError(`Failed to find user by username: ${error}`);
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
    // Validate required fields
    if (!userData.email || !userData.password || !userData.username) {
      throw new UserRepositoryError("Missing required fields: email, password, username");
    }

    // Normalize data
    const normalizedData = {
      ...userData,
      email: userData.email.toLowerCase().trim(),
      username: userData.username.toLowerCase().trim(),
    };

    const result = await db.insert(users).values(normalizedData).returning();
    
    if (!result.length) {
      throw new UserRepositoryError("Failed to create user - no result returned");
    }
    
    return result;
  } catch (error: any) {
    // Handle database constraint violations
    if (error.code === '23505') { // PostgreSQL unique violation
      if (error.constraint?.includes('email')) {
        throw new UserRepositoryError("Email already exists");
      }
      if (error.constraint?.includes('username')) {
        throw new UserRepositoryError("Username already exists");
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

    // Normalize email and username if provided
    const normalizedUpdate = { ...updateObj };
    if (normalizedUpdate.email) {
      normalizedUpdate.email = normalizedUpdate.email.toLowerCase().trim();
    }
    if (normalizedUpdate.username) {
      normalizedUpdate.username = normalizedUpdate.username.toLowerCase().trim();
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
    // Handle database constraint violations
    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        throw new UserRepositoryError("Email already exists");
      }
      if (error.constraint?.includes('username')) {
        throw new UserRepositoryError("Username already exists");
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
    
    // Only return users with valid (non-expired) tokens
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

// Additional helper functions
export const checkEmailExists = async (email: string): Promise<boolean> => {
  const result = await findByEmail(email);
  return result.length > 0;
};

export const checkUsernameExists = async (username: string): Promise<boolean> => {
  const result = await findByUsername(username);
  return result.length > 0;
};

// Export error classes for use in controllers
export { UserRepositoryError, UserNotFoundError };
