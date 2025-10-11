// routes/dashboard.routes.ts
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { getUserDashboardStats } from '../controllers/dashboard.controller';
import { isLoggedIn } from '../middlewares/users.middlewares';

// Response schemas
const BestPerformingProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  total_sales: z.number(),
  total_downloads: z.number(),
  total_views: z.number(),
}).nullable();

const MonthlyRevenueTrendSchema = z.object({
  month: z.string(),
  revenue: z.number(),
});

const DashboardStatsResponse = z.object({
  success: z.boolean(),
  stats: z.object({
    user_performance: z.object({
      projects_owned: z.number(),
      total_purchases: z.number(),
      wishlist_items: z.number(),
      average_rating: z.number(),
    }),
    monthly_activity: z.object({
      new_projects_created: z.number(),
      downloads_received: z.number(),
      new_projects_purchased: z.number(),
    }),
    revenue_financial: z.object({
      total_revenue_earned: z.number(),
      monthly_revenue_trend: z.array(MonthlyRevenueTrendSchema),
      average_sale_price: z.number(),
    }),
    project_performance: z.object({
      best_performing_project: BestPerformingProjectSchema,
      view_to_purchase_conversion: z.number(),
      average_project_rating: z.number(),
      downloads_vs_purchases_ratio: z.number(),
    }),
    engagement_metrics: z.object({
      total_project_views: z.number(),
      wishlist_to_purchase_conversion: z.number(),
      review_count: z.number(),
      positive_review_percentage: z.number(),
      repeat_customer_count: z.number(),
      repeat_customer_percentage: z.number(),
    }),
  }),
});

const getDashboardStatsRoute = createRoute({
  method: 'get',
  path: '/dashboard/stats',
  request: {
    query: z.object({
      months_back: z.string().optional().describe('Number of months for revenue trend (3-12, default: 6)'),
    }),
  },
  responses: {
    200: {
      description: 'Dashboard statistics fetched successfully',
      content: {
        'application/json': {
          schema: DashboardStatsResponse,
        },
      },
    },
  },
  tags: ['Dashboard'],
});

export function dashboardRoutes(app: OpenAPIHono) {
  app.use('/dashboard/*', isLoggedIn);
  app.openapi(getDashboardStatsRoute, getUserDashboardStats);
}
