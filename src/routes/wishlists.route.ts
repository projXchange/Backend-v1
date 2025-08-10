// routes/wishlists.route.ts
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { 
  getUserWishlist,
  addToWishlistHandler,
  removeFromWishlistHandler,
  checkWishlistStatus,
  clearWishlistHandler
} from '../controllers/wishlists.controller';
import { isLoggedIn } from '../middlewares/users.middlewares';

const AddToWishlistRequest = z.object({
  project_id: z.string().uuid(),
});

const ProjectInWishlistResponse = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  author_id: z.string(),
  pricing: z.object({
    sale_price: z.number(),
    original_price: z.number(),
    currency: z.string(),
  }).nullable(),
  status: z.string(),
  is_featured: z.boolean(),
  created_at: z.string(),
});

const WishlistItemResponse = z.object({
  id: z.string(),
  project_id: z.string(),
  created_at: z.string(),
  project: ProjectInWishlistResponse,
});

const WishlistResponse = z.object({
  wishlist: z.array(WishlistItemResponse),
  total: z.number(),
});

const MessageResponse = z.object({
  message: z.string(),
});

const getUserWishlistRoute = createRoute({
  method: 'get',
  path: '/wishlist',
  responses: {
    200: {
      description: 'User wishlist fetched successfully',
      content: {
        'application/json': {
          schema: WishlistResponse,
        },
      },
    },
  },
  tags: ['Wishlist'],
});

const addToWishlistRoute = createRoute({
  method: 'post',
  path: '/wishlist',
  request: {
    body: {
      content: {
        'application/json': {
          schema: AddToWishlistRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Project added to wishlist successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            wishlist_item: WishlistItemResponse,
          }),
        },
      },
    },
  },
  tags: ['Wishlist'],
});

const removeFromWishlistRoute = createRoute({
  method: 'delete',
  path: '/wishlist/{project_id}',
  request: {
    params: z.object({
      project_id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Project removed from wishlist successfully',
      content: {
        'application/json': {
          schema: MessageResponse,
        },
      },
    },
  },
  tags: ['Wishlist'],
});

const checkWishlistStatusRoute = createRoute({
  method: 'get',
  path: '/wishlist/{project_id}/status',
  request: {
    params: z.object({
      project_id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Wishlist status checked successfully',
      content: {
        'application/json': {
          schema: z.object({
            in_wishlist: z.boolean(),
          }),
        },
      },
    },
  },
  tags: ['Wishlist'],
});

const clearWishlistRoute = createRoute({
  method: 'delete',
  path: '/wishlist',
  responses: {
    200: {
      description: 'Wishlist cleared successfully',
      content: {
        'application/json': {
          schema: MessageResponse,
        },
      },
    },
  },
  tags: ['Wishlist'],
});

export function wishlistRoutes(app: OpenAPIHono) {
  app.use('/wishlist/*', isLoggedIn);
  
  app.openapi(getUserWishlistRoute, getUserWishlist);
  app.openapi(addToWishlistRoute, addToWishlistHandler);
  app.openapi(removeFromWishlistRoute, removeFromWishlistHandler);
  app.openapi(checkWishlistStatusRoute, checkWishlistStatus);
  app.openapi(clearWishlistRoute, clearWishlistHandler);
}
