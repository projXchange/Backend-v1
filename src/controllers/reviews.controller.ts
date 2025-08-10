// controllers/reviews.controller.ts
import { 
  findByProject, 
  findByUser, 
  findById,
  createReview, 
  updateReview, 
  deleteReview,
  getProjectRatingStats,
  getPendingReviews
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
    console.error("Get project reviews error:", error);
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
    console.error("Get user reviews error:", error);
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
    console.error("Create review error:", error);
    const status = error.message.includes("already reviewed") ? 409 : 500;
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
    const { rating, review_text, is_approved } = await c.req.json();

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

    // Check permissions
    const canEditContent = currentReview.user_id === userId;
    const canModerate = ["admin", "manager"].includes(user.user_type);

    if (!canEditContent && !canModerate) {
      return c.json({ error: "Unauthorized to update this review" }, 403);
    }

    const updateData: any = {};
    
    // Only review author can update content
    if (canEditContent) {
      if (rating !== undefined) {
        if (rating < 1 || rating > 5) {
          return c.json({ error: "Rating must be between 1 and 5" }, 400);
        }
        updateData.rating = rating;
      }
      if (review_text !== undefined) updateData.review_text = review_text;
    }
    
    // Only admin/manager can update approval status
    if (canModerate && is_approved !== undefined) {
      updateData.is_approved = is_approved;
    }

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    const [updatedReview] = await updateReview(id, updateData);
    
    return c.json({ 
      message: "Review updated successfully",
      review: updatedReview
    });
  } catch (error: any) {
    console.error("Update review error:", error);
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
    console.error("Delete review error:", error);
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
    console.error("Get project rating stats error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch rating stats" 
    }, 500);
  }
};

// Admin only
export const getPendingReviewsHandler = async (c: any) => {
  try {
    const reviews = await getPendingReviews();
    
    return c.json({ 
      pending_reviews: reviews,
      total: reviews.length
    });
  } catch (error: any) {
    console.error("Get pending reviews error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch pending reviews" 
    }, 500);
  }
};
