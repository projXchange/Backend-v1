// repository/reviews.repository.ts
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { reviews, users } from "../models/schema";
import db from "./db";

class ReviewRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewRepositoryError";
  }
}

class ReviewNotFoundError extends ReviewRepositoryError {
  constructor(message = "Review not found") {
    super(message);
    this.name = "ReviewNotFoundError";
  }
}

export interface CreateReviewData {
  user_id: string;
  project_id: string;
  rating: number;
  review_text?: string;
  is_verified_purchase?: boolean;
}

export interface UpdateReviewData {
  rating?: number;
  review_text?: string;
  is_approved?: boolean;
}

export const findByProject = async (projectId: string) => {
  try {
    if (!projectId || typeof projectId !== "string") {
      throw new ReviewRepositoryError("Invalid project ID parameter");
    }

    return await db.select({
      id: reviews.id,
      rating: reviews.rating,
      review_text: reviews.review_text,
      is_verified_purchase: reviews.is_verified_purchase,
      is_approved: reviews.is_approved,
      created_at: reviews.created_at,
      updated_at: reviews.updated_at,
      user: {
        id: users.id,
        full_name: users.full_name,
        email: users.email
      }
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.user_id, users.id))
    .where(and(
      eq(reviews.project_id, projectId),
      eq(reviews.is_approved, true)
    ))
    .orderBy(desc(reviews.created_at));
  } catch (error) {
    throw new ReviewRepositoryError(`Failed to find project reviews: ${error}`);
  }
};

export const findByUser = async (userId: string) => {
  try {
    if (!userId || typeof userId !== "string") {
      throw new ReviewRepositoryError("Invalid user ID parameter");
    }

    return await db.select()
      .from(reviews)
      .where(eq(reviews.user_id, userId))
      .orderBy(desc(reviews.created_at));
  } catch (error) {
    throw new ReviewRepositoryError(`Failed to find user reviews: ${error}`);
  }
};

export const findById = async (id: string) => {
  try {
    if (!id || typeof id !== "string") {
      throw new ReviewRepositoryError("Invalid review ID parameter");
    }

    const result = await db.select().from(reviews).where(eq(reviews.id, id));
    if (!result.length) {
      throw new ReviewNotFoundError(`Review with ID ${id} not found`);
    }
    return result;
  } catch (error) {
    if (error instanceof ReviewRepositoryError) throw error;
    throw new ReviewRepositoryError(`Failed to find review by ID: ${error}`);
  }
};

export const createReview = async (reviewData: CreateReviewData) => {
  try {
    if (!reviewData.user_id || !reviewData.project_id || !reviewData.rating) {
      throw new ReviewRepositoryError("User ID, Project ID, and rating are required");
    }

    if (reviewData.rating < 1 || reviewData.rating > 5) {
      throw new ReviewRepositoryError("Rating must be between 1 and 5");
    }

    // Check if user already reviewed this project
    const existing = await db.select()
      .from(reviews)
      .where(and(
        eq(reviews.user_id, reviewData.user_id),
        eq(reviews.project_id, reviewData.project_id)
      ));

    if (existing.length > 0) {
      throw new ReviewRepositoryError("User has already reviewed this project");
    }

    const result = await db.insert(reviews).values({
      ...reviewData,
      is_verified_purchase: reviewData.is_verified_purchase || false
    }).returning();

    if (!result.length) {
      throw new ReviewRepositoryError("Failed to create review");
    }
    return result;
  } catch (error: any) {
    if (error instanceof ReviewRepositoryError) throw error;
    throw new ReviewRepositoryError(`Failed to create review: ${error.message}`);
  }
};

export const updateReview = async (id: string, updateData: UpdateReviewData) => {
  try {
    if (!id || typeof id !== "string") {
      throw new ReviewRepositoryError("Invalid review ID parameter");
    }
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new ReviewRepositoryError("No update data provided");
    }

    if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
      throw new ReviewRepositoryError("Rating must be between 1 and 5");
    }

    const result = await db.update(reviews)
      .set(updateData)
      .where(eq(reviews.id, id))
      .returning();

    if (!result.length) {
      throw new ReviewNotFoundError(`Review with ID ${id} not found or no changes made`);
    }
    return result;
  } catch (error) {
    if (error instanceof ReviewRepositoryError) throw error;
    throw new ReviewRepositoryError(`Failed to update review: ${error}`);
  }
};

export const deleteReview = async (id: string) => {
  try {
    if (!id || typeof id !== "string") {
      throw new ReviewRepositoryError("Invalid review ID parameter");
    }

    const result = await db.delete(reviews).where(eq(reviews.id, id)).returning();
    if (!result.length) {
      throw new ReviewNotFoundError(`Review with ID ${id} not found`);
    }
    return result;
  } catch (error) {
    if (error instanceof ReviewRepositoryError) throw error;
    throw new ReviewRepositoryError(`Failed to delete review: ${error}`);
  }
};

export const getProjectRatingStats = async (projectId: string) => {
  try {
    const stats = await db.select({
      average_rating: sql<number>`AVG(${reviews.rating})::DECIMAL(3,2)`,
      total_ratings: sql<number>`COUNT(*)`,
      rating_5: sql<number>`COUNT(*) FILTER (WHERE ${reviews.rating} = 5)`,
      rating_4: sql<number>`COUNT(*) FILTER (WHERE ${reviews.rating} = 4)`,
      rating_3: sql<number>`COUNT(*) FILTER (WHERE ${reviews.rating} = 3)`,
      rating_2: sql<number>`COUNT(*) FILTER (WHERE ${reviews.rating} = 2)`,
      rating_1: sql<number>`COUNT(*) FILTER (WHERE ${reviews.rating} = 1)`
    })
    .from(reviews)
    .where(and(
      eq(reviews.project_id, projectId),
      eq(reviews.is_approved, true)
    ));

    return stats[0];
  } catch (error) {
    throw new ReviewRepositoryError(`Failed to get project rating stats: ${error}`);
  }
};

export const getPendingReviews = async () => {
  try {
    return await db.select({
      id: reviews.id,
      rating: reviews.rating,
      review_text: reviews.review_text,
      created_at: reviews.created_at,
      user: {
        id: users.id,
        full_name: users.full_name,
        email: users.email
      }
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.user_id, users.id))
    .where(eq(reviews.is_approved, false))
    .orderBy(asc(reviews.created_at));
  } catch (error) {
    throw new ReviewRepositoryError(`Failed to get pending reviews: ${error}`);
  }
};

export { ReviewRepositoryError, ReviewNotFoundError };
