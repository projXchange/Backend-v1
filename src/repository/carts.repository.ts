// repository/carts.repository.ts
import { eq, and, desc, sql } from "drizzle-orm";
import { carts, projects } from "../models/schema";
import db from "./db";

class CartRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartRepositoryError";
  }
}

export interface CreateCartItemData {
  user_id: string;
  project_id: string;
  price_at_time: string; // decimal fields expect string values
  currency?: "INR" | "USD";
  quantity?: number;
}

export interface UpdateCartItemData {
  quantity?: number;
  price_at_time?: string; // decimal fields expect string values
}

export const findByUser = async (userId: string) => {
  try {
    if (!userId || typeof userId !== "string") {
      throw new CartRepositoryError("Invalid user ID parameter");
    }

    return await db.select({
      id: carts.id,
      project_id: carts.project_id,
      quantity: carts.quantity,
      price_at_time: carts.price_at_time,
      currency: carts.currency,
      created_at: carts.created_at,
      updated_at: carts.updated_at,
      project: {
        id: projects.id,
        title: projects.title,
        description: projects.description,
        category: projects.category,
        author_id: projects.author_id,
        status: projects.status,
        pricing: projects.pricing
      }
    })
    .from(carts)
    .innerJoin(projects, eq(carts.project_id, projects.id))
    .where(eq(carts.user_id, userId))
    .orderBy(desc(carts.created_at));
  } catch (error) {
    throw new CartRepositoryError(`Failed to find user cart: ${error}`);
  }
};

export const addToCart = async (cartData: CreateCartItemData) => {
  try {
    if (!cartData.user_id || !cartData.project_id || !cartData.price_at_time) {
      throw new CartRepositoryError("User ID, Project ID, and price are required");
    }

    // Check if item already in cart
    const existing = await db.select()
      .from(carts)
      .where(and(
        eq(carts.user_id, cartData.user_id),
        eq(carts.project_id, cartData.project_id)
      ));

    if (existing.length > 0) {
      throw new CartRepositoryError("Project already in cart");
    }

    const result = await db.insert(carts).values({
      ...cartData,
      quantity: cartData.quantity || 1,
      currency: cartData.currency || "INR"
    }).returning();

    if (!result.length) {
      throw new CartRepositoryError("Failed to add to cart");
    }
    return result;
  } catch (error: any) {
    if (error instanceof CartRepositoryError) throw error;
    throw new CartRepositoryError(`Failed to add to cart: ${error.message}`);
  }
};

export const updateCartItem = async (userId: string, projectId: string, updateData: UpdateCartItemData) => {
  try {
    if (!userId || !projectId) {
      throw new CartRepositoryError("User ID and Project ID are required");
    }
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new CartRepositoryError("No update data provided");
    }

    const result = await db.update(carts)
      .set(updateData)
      .where(and(
        eq(carts.user_id, userId),
        eq(carts.project_id, projectId)
      ))
      .returning();

    if (!result.length) {
      throw new CartRepositoryError("Cart item not found or no changes made");
    }
    return result;
  } catch (error) {
    throw new CartRepositoryError(`Failed to update cart item: ${error}`);
  }
};

export const removeFromCart = async (userId: string, projectId: string) => {
  try {
    if (!userId || !projectId) {
      throw new CartRepositoryError("User ID and Project ID are required");
    }

    const result = await db.delete(carts)
      .where(and(
        eq(carts.user_id, userId),
        eq(carts.project_id, projectId)
      ))
      .returning();

    if (!result.length) {
      throw new CartRepositoryError("Cart item not found");
    }
    return result;
  } catch (error) {
    throw new CartRepositoryError(`Failed to remove from cart: ${error}`);
  }
};

export const clearCart = async (userId: string) => {
  try {
    if (!userId || typeof userId !== "string") {
      throw new CartRepositoryError("Invalid user ID parameter");
    }

    await db.delete(carts).where(eq(carts.user_id, userId));
  } catch (error) {
    throw new CartRepositoryError(`Failed to clear cart: ${error}`);
  }
};

export const getCartTotal = async (userId: string) => {
  try {
    const result = await db.select({
      total_items: sql<number>`COUNT(*)`,
      total_amount: sql<number>`SUM(${carts.price_at_time} * ${carts.quantity})`,
      currency: carts.currency
    })
    .from(carts)
    .where(eq(carts.user_id, userId))
    .groupBy(carts.currency);

    return result;
  } catch (error) {
    throw new CartRepositoryError(`Failed to get cart total: ${error}`);
  }
};

export const checkInCart = async (userId: string, projectId: string): Promise<boolean> => {
  try {
    const result = await db.select()
      .from(carts)
      .where(and(
        eq(carts.user_id, userId),
        eq(carts.project_id, projectId)
      ));
    return result.length > 0;
  } catch (error) {
    return false;
  }
};

export { CartRepositoryError };
