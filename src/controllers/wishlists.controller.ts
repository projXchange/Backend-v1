// controllers/wishlists.controller.ts
import { 
  findByUser, 
  addToWishlist, 
  removeFromWishlist, 
  checkInWishlist,
  clearWishlist
} from "../repository/wishlists.repository";

export const getUserWishlist = async (c: any) => {
  try {
    const userId = c.get("userId");
    
    const wishlist = await findByUser(userId);
    
    return c.json({ 
      wishlist,
      total: wishlist.length 
    });
  } catch (error: any) {
    c.logger.error("Failed to fetch user wishlist", error, {
      userId: c.get("userId"),
      action: 'get_wishlist'
    });
    return c.json({ 
      error: error.message || "Failed to fetch wishlist" 
    }, 500);
  }
};

export const addToWishlistHandler = async (c: any) => {
  try {
    const userId = c.get("userId");
    const { project_id } = await c.req.json();

    if (!project_id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    const [wishlistItem] = await addToWishlist(userId, project_id);
    
    return c.json({ 
      message: "Project added to wishlist successfully",
      wishlist_item: wishlistItem
    });
  } catch (error: any) {
    const status = error.message.includes("already in wishlist") ? 409 : 500;
    const { project_id } = await c.req.json();
    c.logger.error("Failed to add to wishlist", error, {
      userId: c.get("userId"),
      projectId: project_id,
      isConflict: status === 409,
      action: 'add_to_wishlist'
    });
    return c.json({ 
      error: error.message || "Failed to add to wishlist" 
    }, status);
  }
};

export const removeFromWishlistHandler = async (c: any) => {
  try {
    const userId = c.get("userId");
    const { project_id } = c.req.param();

    if (!project_id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    await removeFromWishlist(userId, project_id);
    
    return c.json({ 
      message: "Project removed from wishlist successfully" 
    });
  } catch (error: any) {
    const { project_id } = c.req.param();
    c.logger.error("Failed to remove from wishlist", error, {
      userId: c.get("userId"),
      projectId: project_id,
      action: 'remove_from_wishlist'
    });
    return c.json({ 
      error: error.message || "Failed to remove from wishlist" 
    }, 500);
  }
};

export const checkWishlistStatus = async (c: any) => {
  try {
    const userId = c.get("userId");
    const { project_id } = c.req.param();

    if (!project_id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    const inWishlist = await checkInWishlist(userId, project_id);
    
    return c.json({ 
      in_wishlist: inWishlist 
    });
  } catch (error: any) {
    const { project_id } = c.req.param();
    c.logger.error("Failed to check wishlist status", error, {
      userId: c.get("userId"),
      projectId: project_id,
      action: 'check_wishlist_status'
    });
    return c.json({ 
      error: error.message || "Failed to check wishlist status" 
    }, 500);
  }
};

export const clearWishlistHandler = async (c: any) => {
  try {
    const userId = c.get("userId");
    
    await clearWishlist(userId);
    
    return c.json({ 
      message: "Wishlist cleared successfully" 
    });
  } catch (error: any) {
    c.logger.error("Failed to clear wishlist", error, {
      userId: c.get("userId"),
      action: 'clear_wishlist'
    });
    return c.json({ 
      error: error.message || "Failed to clear wishlist" 
    }, 500);
  }
};
