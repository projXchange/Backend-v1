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
  getPendingReviewsHandler
} from '../controllers/reviews.controller';
import { isLoggedIn, requireManager } from '../middlewares/users.middlewares';

const CreateReviewRequest = z.object({
  project_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().optional(),
});

const UpdateReviewRequest = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  review_text: z.string().optional(),
  is_approved: z.boolean().optional(),
});

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

const MessageResponse = z.object({
  message: z.string(),
});

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

const getPendingReviewsRoute = createRoute({
  method: 'get',
  path: '/admin/reviews/pending',
  responses: {
    200: {
      description: 'Pending reviews fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            pending_reviews: z.array(ReviewResponse),
            total: z.number(),
          }),
        },
      },
    },
  },
  tags: ['Admin - Reviews'],
});

export function reviewsRoutes(app: OpenAPIHono) {
  // Public routes
  app.openapi(getProjectReviewsRoute, getProjectReviews);
  app.openapi(getProjectRatingStatsRoute, getProjectRatingStatsHandler);

  // Protected routes
  app.use('/reviews/*', isLoggedIn);
  app.openapi(getUserReviewsRoute, getUserReviews);
  app.openapi(createReviewRoute, createReviewHandler);
  app.openapi(updateReviewRoute, updateReviewHandler);
  app.openapi(deleteReviewRoute, deleteReviewHandler);

  // Admin routes
  app.use('/admin/reviews/*', isLoggedIn, requireManager);
  app.openapi(getPendingReviewsRoute, getPendingReviewsHandler);
}
