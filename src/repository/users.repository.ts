import { eq, and, gt, ne, isNull } from "drizzle-orm";
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
  user_type?: "user" | "admin" | "manager";
  // Profile fields
  rating?: number;
  total_sales?: number;
  total_purchases?: number;
  experience_level?: "beginner" | "intermediate" | "expert";
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  social_links?: any;
  skills?: string[];
}

export interface UpdateUserData {
  email?: string;
  full_name?: string;
  password?: string;
  user_type?: "user" | "admin" | "manager";
  verification_status?: "pending" | "verified" | "rejected";
  status?: "active" | "inactive" | "deleted";
  last_login?: Date;
  email_verified?: boolean;
  forgot_password_token?: string | null;
  forgot_password_expiry?: Date | null;
  deleted_at?: Date | null;
  // Profile fields
  rating?: number;
  total_sales?: number;
  total_purchases?: number;
  experience_level?: "beginner" | "intermediate" | "expert";
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  social_links?: any;
  skills?: string[];
}

export const findByEmail = async (email: string, includeDeleted = false) => {
  try {
    if (!email || typeof email !== "string") {
      throw new UserRepositoryError("Invalid email parameter");
    }
    
    if (includeDeleted) {
      return await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
    } else {
      return await db.select().from(users).where(
        and(
          eq(users.email, email.toLowerCase().trim()),
          ne(users.status, "deleted")
        )
      );
    }
  } catch (error) {
    if (error instanceof UserRepositoryError) throw error;
    throw new UserRepositoryError(`Failed to find user by email: ${error}`);
  }
};

export const findById = async (id: string, includeDeleted = false) => {
  try {
    if (!id || typeof id !== "string") {
      throw new UserRepositoryError("Invalid user ID parameter");
    }
    
    let result;
    if (includeDeleted) {
      result = await db.select().from(users).where(eq(users.id, id));
    } else {
      result = await db.select().from(users).where(
        and(
          eq(users.id, id),
          ne(users.status, "deleted")
        )
      );
    }
    
    if (!result.length) {
      throw new UserNotFoundError(`User with ID ${id} not found`);
    }
    return result;
  } catch (error) {
    if (error instanceof UserRepositoryError) throw error;
    throw new UserRepositoryError(`Failed to find user by ID: ${error}`);
  }
};

export const findAllUsers = async (includeDeleted = false) => {
  try {
    if (includeDeleted) {
      return await db.select().from(users);
    } else {
      return await db.select().from(users).where(ne(users.status, "deleted"));
    }
  } catch (error) {
    throw new UserRepositoryError(`Failed to fetch users: ${error}`);
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

export const softDeleteUser = async (id: string) => {
  try {
    const result = await updateUser(id, { 
      status: "deleted", 
      deleted_at: new Date() 
    });
    return result;
  } catch (error) {
    throw new UserRepositoryError(`Failed to soft delete user: ${error}`);
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
          gt(users.forgot_password_expiry, new Date()),
          ne(users.status, "deleted")
        )
      );
  } catch (error) {
    if (error instanceof UserRepositoryError) throw error;
    throw new UserRepositoryError(`Failed to find user by forgot token: ${error}`);
  }
};

export const findAuthorDetails = async (authorId: string) => {
  try {
    
    const result = await db.select({
      id: users.id,
      full_name: users.full_name,
      email: users.email,
      avatar: users.avatar,
      bio: users.bio,
      location: users.location,
      website: users.website,
      social_links: users.social_links,
      skills: users.skills,
      rating: users.rating,
      total_sales: users.total_sales,
      experience_level: users.experience_level,
    })
    .from(users)
    .where(
      and(
        eq(users.id, authorId),
        ne(users.status, "deleted")
      )
    );
    
    if (!result.length) {
      throw new UserNotFoundError(`Author with ID ${authorId} not found`);
    }
    return result[0];
  } catch (error) {
    if (error instanceof UserRepositoryError) throw error;
    throw new UserRepositoryError(`Failed to find author details: ${error}`);
  }
};


export const checkEmailExists = async (email: string): Promise<boolean> => {
  const result = await findByEmail(email);
  return result.length > 0;
};

export { UserRepositoryError, UserNotFoundError };
