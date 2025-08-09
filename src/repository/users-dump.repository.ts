import { eq, and, ne } from "drizzle-orm";
import { users_dump } from "../models/schema";
import db from "./db";

class UsersDumpRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsersDumpRepositoryError";
  }
}

class UsersDumpNotFoundError extends UsersDumpRepositoryError {
  constructor(message = "Users dump record not found") {
    super(message);
    this.name = "UsersDumpNotFoundError";
  }
}

export interface CreateUsersDumpData {
  id: string; // user_id
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

export interface UpdateUsersDumpData {
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
  status?: "active" | "inactive" | "deleted";
  deleted_at?: Date | null;
}

export const findById = async (id: string, includeDeleted = false) => {
  try {
    if (!id || typeof id !== "string") {
      throw new UsersDumpRepositoryError("Invalid user ID parameter");
    }
    
    const whereConditions = [eq(users_dump.id, id)];
    if (!includeDeleted) {
      whereConditions.push(ne(users_dump.status, "deleted"));
    }
    
    const result = await db.select().from(users_dump).where(and(...whereConditions));
    if (!result.length) {
      throw new UsersDumpNotFoundError(`Users dump record with ID ${id} not found`);
    }
    return result;
  } catch (error) {
    if (error instanceof UsersDumpRepositoryError) throw error;
    throw new UsersDumpRepositoryError(`Failed to find users dump by ID: ${error}`);
  }
};

export const findAll = async (includeDeleted = false) => {
  try {
    const whereConditions = includeDeleted ? [] : [ne(users_dump.status, "deleted")];
    
    if (whereConditions.length > 0) {
      return await db.select().from(users_dump).where(and(...whereConditions));
    }
    return await db.select().from(users_dump);
  } catch (error) {
    throw new UsersDumpRepositoryError(`Failed to fetch users dump records: ${error}`);
  }
};

export const createUsersDump = async (userData: CreateUsersDumpData) => {
  try {
    if (!userData.id) {
      throw new UsersDumpRepositoryError("Missing required field: id (user_id)");
    }
    
    const result = await db.insert(users_dump).values(userData).returning();
    if (!result.length) {
      throw new UsersDumpRepositoryError("Failed to create users dump record - no result returned");
    }
    return result;
  } catch (error: any) {
    if (error.code === '23505') {
      throw new UsersDumpRepositoryError("Users dump record already exists for this user");
    }
    if (error instanceof UsersDumpRepositoryError) throw error;
    throw new UsersDumpRepositoryError(`Failed to create users dump record: ${error.message}`);
  }
};

export const updateUsersDump = async (id: string, updateObj: UpdateUsersDumpData) => {
  try {
    if (!id || typeof id !== "string") {
      throw new UsersDumpRepositoryError("Invalid user ID parameter");
    }
    if (!updateObj || Object.keys(updateObj).length === 0) {
      throw new UsersDumpRepositoryError("No update data provided");
    }
    
    const result = await db.update(users_dump)
      .set(updateObj)
      .where(eq(users_dump.id, id))
      .returning();
    
    if (!result.length) {
      throw new UsersDumpNotFoundError(`Users dump record with ID ${id} not found or no changes made`);
    }
    return result;
  } catch (error) {
    if (error instanceof UsersDumpRepositoryError) throw error;
    throw new UsersDumpRepositoryError(`Failed to update users dump record: ${error}`);
  }
};

export const softDeleteUsersDump = async (id: string) => {
  try {
    const result = await updateUsersDump(id, { 
      status: "deleted", 
      deleted_at: new Date() 
    });
    return result;
  } catch (error) {
    throw new UsersDumpRepositoryError(`Failed to soft delete users dump record: ${error}`);
  }
};

export { UsersDumpRepositoryError, UsersDumpNotFoundError };
