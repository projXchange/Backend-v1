// routes/reviews.route.ts
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { 
  getProjectReviews,
  getUserReviews,
  createReviewHandler,
  updateReviewHandler,
  deleteReviewHandler,
  getProjectRatingStatsHandler,
  getAllReviewsHandler
} from '../controllers/reviews.controller';
import { isLoggedIn, requireManager } from '../middlewares/users.middlewares';

const MessageResponse = z.object({
  message: z.string(),
});

// ===== SHARED RESPONSE SCHEMAS =====
const UserInReviewResponse = z.object({
  id: z.string(),
  full_name: z.string().nullable(),
  email: z.string(),
});

const ReviewResponse = z.object({
  id: z.string(),
  rating: z.number(),
  review_text: z.string().nullable(),
  is_verified_purchase: z.boolean(),
  is_approved: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  user: UserInReviewResponse,
});

const RatingStatsResponse = z.object({
  average_rating: z.string().nullable(),
  total_ratings: z.number(),
  rating_5: z.number(),
  rating_4: z.number(),
  rating_3: z.number(),
  rating_2: z.number(),
  rating_1: z.number(),
});

// ===== ROUTE DEFINITIONS =====

// 1. GET PROJECT REVIEWS - GET /projects/{project_id}/reviews
const getProjectReviewsRoute = createRoute({
  method: 'get',
  path: '/projects/{project_id}/reviews',
  request: {
    params: z.object({
      project_id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Project reviews fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            project_id: z.string(),
            reviews: z.array(ReviewResponse),
            stats: RatingStatsResponse,
            total: z.number(),
          }),
        },
      },
    },
  },
  tags: ['Reviews'],
});

// 2. GET MY REVIEWS - GET /reviews/my
const getUserReviewsRoute = createRoute({
  method: 'get',
  path: '/reviews/my',
  responses: {
    200: {
      description: 'User reviews fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            reviews: z.array(ReviewResponse),
            total: z.number(),
          }),
        },
      },
    },
  },
  tags: ['Reviews'],
});

// 3. CREATE REVIEW - POST /reviews
const CreateReviewRequest = z.object({
  project_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().optional(),
});

const createReviewRoute = createRoute({
  method: 'post',
  path: '/reviews',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateReviewRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Review created successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            review: ReviewResponse,
          }),
        },
      },
    },
  },
  tags: ['Reviews'],
});

// 4. UPDATE REVIEW - PATCH /reviews/{id}
const UpdateReviewRequest = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  review_text: z.string().optional(),
  is_approved: z.boolean().optional(),
});

const updateReviewRoute = createRoute({
  method: 'patch',
  path: '/reviews/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateReviewRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Review updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            review: ReviewResponse,
          }),
        },
      },
    },
  },
  tags: ['Reviews'],
});

// 5. DELETE REVIEW - DELETE /reviews/{id}
const deleteReviewRoute = createRoute({
  method: 'delete',
  path: '/reviews/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Review deleted successfully',
      content: {
        'application/json': {
          schema: MessageResponse,
        },
      },
    },
  },
  tags: ['Reviews'],
});

// 6. GET PROJECT RATING STATS - GET /projects/{project_id}/ratings
const getProjectRatingStatsRoute = createRoute({
  method: 'get',
  path: '/projects/{project_id}/ratings',
  request: {
    params: z.object({
      project_id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Project rating stats fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            project_id: z.string(),
            rating_stats: RatingStatsResponse,
          }),
        },
      },
    },
  },
  tags: ['Reviews'],
});

// 7. GET ALL REVIEWS WITH FILTERING (ADMIN) - GET /admin/reviews
const getAllReviewsRoute = createRoute({
  method: 'get',
  path: '/admin/reviews',
  request: {
    query: z.object({
      status: z.enum(['pending', 'approved', 'all']).optional().default('all'),
      project_id: z.string().uuid().optional(),
      user_id: z.string().uuid().optional(),
      rating: z.number().int().min(1).max(5).optional(),
      is_verified_purchase: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
      sort_by: z.enum(['created_at', 'rating', 'updated_at']).optional().default('created_at'),
      sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
    }),
  },
  responses: {
    200: {
      description: 'Reviews fetched successfully with filtering',
      content: {
        'application/json': {
          schema: z.object({
            reviews: z.array(ReviewResponse),
            total: z.number(),
            filters: z.object({
              status: z.string(),
              project_id: z.string().optional(),
              user_id: z.string().optional(),
              rating: z.number().optional(),
              is_verified_purchase: z.boolean().optional(),
              limit: z.number(),
              offset: z.number(),
              sort_by: z.string(),
              sort_order: z.string(),
            }),
          }),
        },
      },
    },
    400: {
      description: 'Invalid query parameters',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
  tags: ['Admin - Reviews'],
});


export function reviewsRoutes(app: OpenAPIHono) {
  // ===== PUBLIC ROUTES (No Authentication Required) =====
  // GET /projects/{project_id}/reviews - Get project reviews
  app.openapi(getProjectReviewsRoute, getProjectReviews);
  
  // GET /projects/{project_id}/ratings - Get project rating stats
  app.openapi(getProjectRatingStatsRoute, getProjectRatingStatsHandler);

  // ===== PROTECTED ROUTES (Authentication Required) =====
  // GET /reviews/my - Get my reviews
  app.use('/reviews/my', isLoggedIn);
  app.openapi(getUserReviewsRoute, getUserReviews);
  
  // POST /reviews - Create new review
  app.use('/reviews', isLoggedIn);
  app.openapi(createReviewRoute, createReviewHandler);
  
  // PATCH /reviews/{id} - Update review
  app.use('/reviews/*', isLoggedIn);
  app.openapi(updateReviewRoute, updateReviewHandler);
  
  // DELETE /reviews/{id} - Delete review
  app.openapi(deleteReviewRoute, deleteReviewHandler);

  // ===== ADMIN ROUTES (Admin/Manager Only) =====
  // GET /admin/reviews - Get all reviews with filtering
  app.use('/admin/reviews', isLoggedIn, requireManager);
  app.openapi(getAllReviewsRoute, getAllReviewsHandler);
}
