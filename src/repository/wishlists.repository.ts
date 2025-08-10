// repository/wishlists.repository.ts
import { eq, and, desc } from "drizzle-orm";
import { wishlists, projects } from "../models/schema";
import db from "./db";

class WishlistRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WishlistRepositoryError";
  }
}

export const findByUser = async (userId: string) => {
  try {
    if (!userId || typeof userId !== "string") {
      throw new WishlistRepositoryError("Invalid user ID parameter");
    }

    return await db.select({
      id: wishlists.id,
      project_id: wishlists.project_id,
      created_at: wishlists.created_at,
      project: projects
    })
    .from(wishlists)
    .innerJoin(projects, eq(wishlists.project_id, projects.id))
    .where(eq(wishlists.user_id, userId))
    .orderBy(desc(wishlists.created_at));
  } catch (error) {
    throw new WishlistRepositoryError(`Failed to find user wishlist: ${error}`);
  }
};

export const addToWishlist = async (userId: string, projectId: string) => {
  try {
    if (!userId || !projectId) {
      throw new WishlistRepositoryError("User ID and Project ID are required");
    }

    // Check if already in wishlist
    const existing = await db.select()
      .from(wishlists)
      .where(and(
        eq(wishlists.user_id, userId),
        eq(wishlists.project_id, projectId)
      ));

    if (existing.length > 0) {
      throw new WishlistRepositoryError("Project already in wishlist");
    }

    const result = await db.insert(wishlists).values({
      user_id: userId,
      project_id: projectId
    }).returning();

    if (!result.length) {
      throw new WishlistRepositoryError("Failed to add to wishlist");
    }
    return result;
  } catch (error: any) {
    if (error instanceof WishlistRepositoryError) throw error;
    throw new WishlistRepositoryError(`Failed to add to wishlist: ${error.message}`);
  }
};

export const removeFromWishlist = async (userId: string, projectId: string) => {
  try {
    if (!userId || !projectId) {
      throw new WishlistRepositoryError("User ID and Project ID are required");
    }

    const result = await db.delete(wishlists)
      .where(and(
        eq(wishlists.user_id, userId),
        eq(wishlists.project_id, projectId)
      ))
      .returning();

    if (!result.length) {
      throw new WishlistRepositoryError("Project not found in wishlist");
    }
    return result;
  } catch (error) {
    throw new WishlistRepositoryError(`Failed to remove from wishlist: ${error}`);
  }
};

export const checkInWishlist = async (userId: string, projectId: string): Promise<boolean> => {
  try {
    const result = await db.select()
      .from(wishlists)
      .where(and(
        eq(wishlists.user_id, userId),
        eq(wishlists.project_id, projectId)
      ));
    return result.length > 0;
  } catch (error) {
    return false;
  }
};

export const clearWishlist = async (userId: string) => {
  try {
    await db.delete(wishlists).where(eq(wishlists.user_id, userId));
  } catch (error) {
    throw new WishlistRepositoryError(`Failed to clear wishlist: ${error}`);
  }
};

export { WishlistRepositoryError };
