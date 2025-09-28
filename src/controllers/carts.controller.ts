// controllers/carts.controller.ts
import { 
  findByUser, 
  addToCart, 
  updateCartItem, 
  removeFromCart,
  clearCart,
  getCartTotal,
  checkInCart
} from "../repository/carts.repository";
import { findById as findProjectById } from "../repository/projects.repository";

export const getUserCart = async (c: any) => {
  try {
    const userId = c.get("userId");
    
    const cart = await findByUser(userId);
    const totals = await getCartTotal(userId);
    
    return c.json({ 
      cart,
      totals,
      total_items: cart.length
    });
  } catch (error: any) {
    c.logger.error("Failed to fetch user cart", error, {
      userId: c.get("userId"),
      action: 'get_cart'
    });
    return c.json({ 
      error: error.message || "Failed to fetch cart" 
    }, 500);
  }
};

export const addToCartHandler = async (c: any) => {
  try {
    const userId = c.get("userId");
    const { project_id, quantity = 1 } = await c.req.json();

    if (!project_id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    // Verify project exists and is published
    let project;
    try {
      const result = await findProjectById(project_id);
      project = result[0];
    } catch (error) {
      return c.json({ error: "Project not found" }, 404);
    }

    if (project.status !== "published") {
      return c.json({ error: "Project is not available for purchase" }, 400);
    }

    // Check if user is trying to buy their own project
    if (project.author_id === userId) {
      return c.json({ error: "Cannot add your own project to cart" }, 400);
    }

    // Get current price from project
    const currentPrice = project.pricing?.sale_price || 0;
    const currency = project.pricing?.currency || "INR";

    const [cartItem] = await addToCart({
      user_id: userId,
      project_id,
      price_at_time: currentPrice.toString(), // Convert to string for decimal field
      currency,
      quantity
    });
    
    return c.json({ 
      message: "Project added to cart successfully",
      cart_item: cartItem
    });
  } catch (error: any) {
    const status = error.message.includes("already in cart") ? 409 : 500;
    const { project_id, quantity } = await c.req.json();
    c.logger.error("Failed to add to cart", error, {
      userId: c.get("userId"),
      projectId: project_id,
      quantity,
      isConflict: status === 409,
      action: 'add_to_cart'
    });
    return c.json({ 
      error: error.message || "Failed to add to cart" 
    }, status);
  }
};

export const updateCartItemHandler = async (c: any) => {
  try {
    const userId = c.get("userId");
    const { project_id } = c.req.param();
    const { quantity } = await c.req.json();

    if (!project_id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    if (quantity !== undefined && (quantity < 1 || quantity > 10)) {
      return c.json({ error: "Quantity must be between 1 and 10" }, 400);
    }

    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = quantity;

    const [updatedItem] = await updateCartItem(userId, project_id, updateData);
    
    return c.json({ 
      message: "Cart item updated successfully",
      cart_item: updatedItem
    });
  } catch (error: any) {
    const { project_id } = c.req.param();
    const { quantity } = await c.req.json();
    c.logger.error("Failed to update cart item", error, {
      userId: c.get("userId"),
      projectId: project_id,
      quantity,
      action: 'update_cart_item'
    });
    return c.json({ 
      error: error.message || "Failed to update cart item" 
    }, 500);
  }
};

export const removeFromCartHandler = async (c: any) => {
  try {
    const userId = c.get("userId");
    const { project_id } = c.req.param();

    if (!project_id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    await removeFromCart(userId, project_id);
    
    return c.json({ 
      message: "Project removed from cart successfully" 
    });
  } catch (error: any) {
    const { project_id } = c.req.param();
    c.logger.error("Failed to remove from cart", error, {
      userId: c.get("userId"),
      projectId: project_id,
      action: 'remove_from_cart'
    });
    return c.json({ 
      error: error.message || "Failed to remove from cart" 
    }, 500);
  }
};

export const clearCartHandler = async (c: any) => {
  try {
    const userId = c.get("userId");
    
    await clearCart(userId);
    
    return c.json({ 
      message: "Cart cleared successfully" 
    });
  } catch (error: any) {
    c.logger.error("Failed to clear cart", error, {
      userId: c.get("userId"),
      action: 'clear_cart'
    });
    return c.json({ 
      error: error.message || "Failed to clear cart" 
    }, 500);
  }
};

export const checkCartStatus = async (c: any) => {
  try {
    const userId = c.get("userId");
    const { project_id } = c.req.param();

    if (!project_id) {
      return c.json({ error: "Project ID is required" }, 400);
    }

    const inCart = await checkInCart(userId, project_id);
    
    return c.json({ 
      in_cart: inCart 
    });
  } catch (error: any) {
    const { project_id } = c.req.param();
    c.logger.error("Failed to check cart status", error, {
      userId: c.get("userId"),
      projectId: project_id,
      action: 'check_cart_status'
    });
    return c.json({ 
      error: error.message || "Failed to check cart status" 
    }, 500);
  }
};
