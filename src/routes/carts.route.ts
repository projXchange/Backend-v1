// routes/carts.route.ts
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { 
  getUserCart,
  addToCartHandler,
  updateCartItemHandler,
  removeFromCartHandler,
  clearCartHandler,
  checkCartStatus
} from '../controllers/carts.controller';
import { isLoggedIn } from '../middlewares/users.middlewares';

const MessageResponse = z.object({
  message: z.string(),
});

// ===== SHARED RESPONSE SCHEMAS =====
const ProjectInCartResponse = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  author_id: z.string(),
  status: z.string(),
  pricing: z.object({
    sale_price: z.number(),
    original_price: z.number(),
    currency: z.string(),
  }).nullable(),
});

const CartItemResponse = z.object({
  id: z.string(),
  project_id: z.string(),
  quantity: z.number(),
  price_at_time: z.string(),
  currency: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  project: ProjectInCartResponse,
});

const CartTotalResponse = z.object({
  total_items: z.number(),
  total_amount: z.string(),
  currency: z.string(),
});

const CartResponse = z.object({
  cart: z.array(CartItemResponse),
  totals: z.array(CartTotalResponse),
  total_items: z.number(),
});

// ===== ROUTE DEFINITIONS =====

const getUserCartRoute = createRoute({
  method: 'get',
  path: '/cart',
  responses: {
    200: {
      description: 'User cart fetched successfully',
      content: {
        'application/json': {
          schema: CartResponse,
        },
      },
    },
  },
  tags: ['Cart'],
});

// 2. ADD TO CART - POST /cart
const AddToCartRequest = z.object({
  project_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(10).optional(),
});

const addToCartRoute = createRoute({
  method: 'post',
  path: '/cart',
  request: {
    body: {
      content: {
        'application/json': {
          schema: AddToCartRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Project added to cart successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            cart_item: CartItemResponse,
          }),
        },
      },
    },
  },
  tags: ['Cart'],
});

// 3. UPDATE CART ITEM - PATCH /cart/{project_id}
const UpdateCartItemRequest = z.object({
  quantity: z.number().int().min(1).max(10),
});

const updateCartItemRoute = createRoute({
  method: 'patch',
  path: '/cart/{project_id}',
  request: {
    params: z.object({
      project_id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateCartItemRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Cart item updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            cart_item: CartItemResponse,
          }),
        },
      },
    },
  },
  tags: ['Cart'],
});

const removeFromCartRoute = createRoute({
  method: 'delete',
  path: '/cart/{project_id}',
  request: {
    params: z.object({
      project_id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Project removed from cart successfully',
      content: {
        'application/json': {
          schema: MessageResponse,
        },
      },
    },
  },
  tags: ['Cart'],
});

const clearCartRoute = createRoute({
  method: 'delete',
  path: '/cart',
  responses: {
    200: {
      description: 'Cart cleared successfully',
      content: {
        'application/json': {
          schema: MessageResponse,
        },
      },
    },
  },
  tags: ['Cart'],
});

const checkCartStatusRoute = createRoute({
  method: 'get',
  path: '/cart/{project_id}/status',
  request: {
    params: z.object({
      project_id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Cart status checked successfully',
      content: {
        'application/json': {
          schema: z.object({
            in_cart: z.boolean(),
          }),
        },
      },
    },
  },
  tags: ['Cart'],
});

export function cartRoutes(app: OpenAPIHono) {
  app.use('/cart/*', isLoggedIn);
  
  app.openapi(getUserCartRoute, getUserCart);
  app.openapi(addToCartRoute, addToCartHandler);
  app.openapi(updateCartItemRoute, updateCartItemHandler);
  app.openapi(removeFromCartRoute, removeFromCartHandler);
  app.openapi(clearCartRoute, clearCartHandler);
  app.openapi(checkCartStatusRoute, checkCartStatus);
}
