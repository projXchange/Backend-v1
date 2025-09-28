// controllers/reviews.controller.ts
import { 
  findByProject, 
  findByUser, 
  findById,
  createReview, 
  updateReview, 
  deleteReview,
  getProjectRatingStats,
  getReviewStats,
  getAllReviews,
  ReviewFilters
} from "../repository/reviews.repository";
import { checkUserPurchased } from "../repository/projects.repository";

export const getProjectReviews = async (c: any) => {
  try {
    const { project_id } = c.req.param();

    if (!project_id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    const reviews = await findByProject(project_id);
    const stats = await getProjectRatingStats(project_id);
    
    return c.json({ 
      project_id,
      reviews,
      stats,
      total: reviews.length
    });
  } catch (error: any) {
    const { project_id } = c.req.param();
    c.logger.error("Failed to fetch project reviews", error, {
      projectId: project_id,
      action: 'get_project_reviews'
    });
    return c.json({ 
      error: error.message || "Failed to fetch project reviews" 
    }, 500);
  }
};

export const getUserReviews = async (c: any) => {
  try {
    const userId = c.get("userId");
    
    const reviews = await findByUser(userId);
    
    return c.json({ 
      reviews,
      total: reviews.length 
    });
  } catch (error: any) {
    c.logger.error("Failed to fetch user reviews", error, {
      userId: c.get("userId"),
      action: 'get_user_reviews'
    });
    return c.json({ 
      error: error.message || "Failed to fetch user reviews" 
    }, 500);
  }
};

export const createReviewHandler = async (c: any) => {
  try {
    const userId = c.get("userId");
    const { project_id, rating, review_text } = await c.req.json();

    if (!project_id || !rating) {
      return c.json({ error: "Project ID and rating are required" }, 400);
    }

    if (rating < 1 || rating > 5) {
      return c.json({ error: "Rating must be between 1 and 5" }, 400);
    }

    // Check if user has purchased the project
    const hasPurchased = await checkUserPurchased(project_id, userId);
    
    const [newReview] = await createReview({
      user_id: userId,
      project_id,
      rating,
      review_text,
      is_verified_purchase: hasPurchased
    });
    
    return c.json({ 
      message: "Review created successfully",
      review: newReview
    });
  } catch (error: any) {
    const { project_id, rating } = await c.req.json();
    const status = error.message.includes("already reviewed") ? 409 : 500;
    c.logger.error("Failed to create review", error, {
      userId: c.get("userId"),
      projectId: project_id,
      rating,
      isConflict: status === 409,
      action: 'create_review'
    });
    return c.json({ 
      error: error.message || "Failed to create review" 
    }, status);
  }
};

export const updateReviewHandler = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");
    const user = c.get("user");
    const { rating, review_text } = await c.req.json();

    if (!id) {
      return c.json({ error: "Review ID is required" }, 400);
    }

    // Get current review to check ownership
    let currentReview;
    try {
      const result = await findById(id);
      currentReview = result[0];
    } catch (error) {
      return c.json({ error: "Review not found" }, 404);
    }

    // Check permissions - only review author can update
    const canEditContent = currentReview.user_id === userId;

    if (!canEditContent) {
      return c.json({ error: "Unauthorized to update this review" }, 403);
    }

    const updateData: any = {};
    
    // Only allow updating rating and review_text
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return c.json({ error: "Rating must be between 1 and 5" }, 400);
      }
      updateData.rating = rating;
    }
    
    if (review_text !== undefined) {
      updateData.review_text = review_text;
    }

    // If user is updating their review, set is_approved to false (needs re-approval)
    if (Object.keys(updateData).length > 0) {
      updateData.is_approved = false;
    }

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    const [updatedReview] = await updateReview(id, updateData);
    
    // Get stats for the review
    const stats = await getReviewStats(id);
    
    return c.json({ 
      message: "Review updated successfully",
      review: updatedReview,
      stats
    });
  } catch (error: any) {
    const { id } = c.req.param();
    const userId = c.get("userId");
    
    c.logger.error("Failed to update review", error, {
      userId,
      reviewId: id,
      action: 'update_review'
    });
    return c.json({ 
      error: error.message || "Failed to update review" 
    }, 500);
  }
};

export const deleteReviewHandler = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");
    const user = c.get("user");

    if (!id) {
      return c.json({ error: "Review ID is required" }, 400);
    }

    // Get current review to check ownership
    let currentReview;
    try {
      const result = await findById(id);
      currentReview = result[0];
    } catch (error) {
      return c.json({ error: "Review not found" }, 404);
    }

    // Check if user owns the review or is admin/manager
    if (currentReview.user_id !== userId && !["admin", "manager"].includes(user.user_type)) {
      return c.json({ error: "Unauthorized to delete this review" }, 403);
    }

    await deleteReview(id);
    
    return c.json({ 
      message: "Review deleted successfully" 
    });
  } catch (error: any) {
    const { id } = c.req.param();
    c.logger.error("Failed to delete review", error, {
      userId: c.get("userId"),
      reviewId: id,
      action: 'delete_review'
    });
    return c.json({ 
      error: error.message || "Failed to delete review" 
    }, 500);
  }
};

export const getProjectRatingStatsHandler = async (c: any) => {
  try {
    const { project_id } = c.req.param();

    if (!project_id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    const stats = await getProjectRatingStats(project_id);
    
    return c.json({ 
      project_id,
      rating_stats: stats
    });
  } catch (error: any) {
    const { project_id } = c.req.param();
    c.logger.error("Failed to fetch project rating stats", error, {
      projectId: project_id,
      action: 'get_rating_stats'
    });
    return c.json({ 
      error: error.message || "Failed to fetch rating stats" 
    }, 500);
  }
};

// Admin only - Get all reviews with filtering
export const getAllReviewsHandler = async (c: any) => {
  try {
    const query = c.req.query();
    
    // Parse query parameters
    const filters: ReviewFilters = {
      status: query.status as 'pending' | 'approved' | 'all' || 'all',
      project_id: query.project_id,
      user_id: query.user_id,
      rating: query.rating ? parseInt(query.rating) : undefined,
      is_verified_purchase: query.is_verified_purchase ? query.is_verified_purchase === 'true' : undefined,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
      sort_by: query.sort_by as 'created_at' | 'rating' | 'updated_at' || 'created_at',
      sort_order: query.sort_order as 'asc' | 'desc' || 'desc'
    };

    // Validate status parameter
    if (filters.status && !['pending', 'approved', 'all'].includes(filters.status)) {
      return c.json({ error: "Invalid status parameter. Must be 'pending', 'approved', or 'all'" }, 400);
    }

    // Validate rating parameter
    if (filters.rating && (filters.rating < 1 || filters.rating > 5)) {
      return c.json({ error: "Rating must be between 1 and 5" }, 400);
    }

    // Validate sort parameters
    if (filters.sort_by && !['created_at', 'rating', 'updated_at'].includes(filters.sort_by)) {
      return c.json({ error: "Invalid sort_by parameter. Must be 'created_at', 'rating', or 'updated_at'" }, 400);
    }

    if (filters.sort_order && !['asc', 'desc'].includes(filters.sort_order)) {
      return c.json({ error: "Invalid sort_order parameter. Must be 'asc' or 'desc'" }, 400);
    }

    const reviews = await getAllReviews(filters);
    
    return c.json({ 
      reviews,
      total: reviews.length,
      filters: {
        status: filters.status,
        project_id: filters.project_id,
        user_id: filters.user_id,
        rating: filters.rating,
        is_verified_purchase: filters.is_verified_purchase,
        limit: filters.limit,
        offset: filters.offset,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order
      }
    });
  } catch (error: any) {
    c.logger.error("Failed to fetch reviews", error, {
      action: 'get_all_reviews',
      adminOnly: true
    });
    return c.json({ 
      error: error.message || "Failed to fetch reviews" 
    }, 500);
  }
};

