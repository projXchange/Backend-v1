// routes/transactions.route.ts
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { 
  getUserTransactions,
  getAuthorTransactions,
  getTransactionById,
  createTransactionHandler,
  updateTransactionStatus,
  getTransactionStatsHandler,
  getRecentTransactionsHandler
} from '../controllers/transactions.controller';
import { isLoggedIn, requireManager } from '../middlewares/users.middlewares';

const ProjectInTransactionResponse = z.object({
  id: z.string(),
  title: z.string(),
  thumbnail: z.string().nullable(),
});

const UserInTransactionResponse = z.object({
  id: z.string(),
  full_name: z.string().nullable(),
  email: z.string(),
});

const TransactionResponse = z.object({
  id: z.string(),
  transaction_id: z.string(),
  user_id: z.string(),
  project_id: z.string(),
  author_id: z.string(),
  type: z.string(),
  status: z.string(),
  amount: z.string(),
  currency: z.string(),
  payment_method: z.string().nullable(),
  payment_gateway_response: z.any().nullable(),
  commission_amount: z.string(),
  author_amount: z.string(),
  metadata: z.any().nullable(),
  processed_at: z.string().nullable(),
  refunded_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const TransactionWithDetailsResponse = z.object({
  id: z.string(),
  transaction_id: z.string(),
  type: z.string(),
  status: z.string(),
  amount: z.string(),
  currency: z.string(),
  payment_method: z.string().nullable(),
  commission_amount: z.string(),
  author_amount: z.string(),
  processed_at: z.string().nullable(),
  created_at: z.string(),
  project: ProjectInTransactionResponse,
  buyer: UserInTransactionResponse.optional(),
});

const TransactionStatsResponse = z.object({
  total_transactions: z.number(),
  total_revenue: z.string().nullable(),
  total_commission: z.string().nullable(),
  total_author_earnings: z.string().nullable(),
  avg_transaction_amount: z.string().nullable(),
  currency_breakdown: z.any().nullable(),
});

const MessageResponse = z.object({
  message: z.string(),
});

const getUserTransactionsRoute = createRoute({
  method: 'get',
  path: '/transactions/my',
  responses: {
    200: {
      description: 'User transactions fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            transactions: z.array(TransactionWithDetailsResponse),
            total: z.number(),
          }),
        },
      },
    },
  },
  tags: ['Transactions'],
});

const getAuthorTransactionsRoute = createRoute({
  method: 'get',
  path: '/transactions/sales',
  responses: {
    200: {
      description: 'Author transactions fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            transactions: z.array(TransactionWithDetailsResponse),
            total: z.number(),
          }),
        },
      },
    },
  },
  tags: ['Transactions'],
});

const getTransactionByIdRoute = createRoute({
  method: 'get',
  path: '/transactions/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Transaction fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            transaction: TransactionResponse,
          }),
        },
      },
    },
  },
  tags: ['Transactions'],
});

// 4. CREATE TRANSACTION - POST /transactions
const CreateTransactionRequest = z.object({
  transaction_id: z.string(),
  project_id: z.string().uuid(),
  author_id: z.string().uuid(),
  amount: z.number(),
  currency: z.enum(["INR", "USD"]).optional(),
  payment_method: z.string().optional(),
  payment_gateway_response: z.any().optional(),
  metadata: z.any().optional(),
});

const createTransactionRoute = createRoute({
  method: 'post',
  path: '/transactions',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateTransactionRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Transaction created successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            transaction: TransactionResponse,
          }),
        },
      },
    },
  },
  tags: ['Transactions'],
});

// 5. UPDATE TRANSACTION STATUS - PATCH /admin/transactions/{id}/status
const UpdateTransactionRequest = z.object({
  status: z.enum(["pending", "processing", "completed", "failed", "cancelled", "refunded"]).optional(),
  payment_gateway_response: z.any().optional(),
  metadata: z.any().optional(),
});

const updateTransactionStatusRoute = createRoute({
  method: 'patch',
  path: '/admin/transactions/{id}/status',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateTransactionRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Transaction status updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            transaction: TransactionResponse,
          }),
        },
      },
    },
  },
  tags: ['Admin - Transactions'],
});

const getTransactionStatsRoute = createRoute({
  method: 'get',
  path: '/transactions/stats',
  request: {
    query: z.object({
      author_id: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Transaction stats fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            stats: TransactionStatsResponse,
            filters: z.object({
              author_id: z.string().nullable(),
              start_date: z.string().nullable(),
              end_date: z.string().nullable(),
            }),
          }),
        },
      },
    },
  },
  tags: ['Transactions'],
});

const getRecentTransactionsRoute = createRoute({
  method: 'get',
  path: '/admin/transactions/recent',
  request: {
    query: z.object({
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Recent transactions fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            transactions: z.array(TransactionWithDetailsResponse),
            total: z.number(),
          }),
        },
      },
    },
  },
  tags: ['Admin - Transactions'],
});

export function transactionsRoutes(app: OpenAPIHono) {
  // Protected routes
  app.use('/transactions/*', isLoggedIn);
  app.openapi(getUserTransactionsRoute, getUserTransactions);
  app.openapi(getAuthorTransactionsRoute, getAuthorTransactions);
  app.openapi(getTransactionByIdRoute, getTransactionById);
  
  app.openapi(createTransactionRoute, createTransactionHandler);
  
  app.openapi(getTransactionStatsRoute, getTransactionStatsHandler);

  // Admin routes
  app.use('/admin/transactions/*', isLoggedIn, requireManager);
  
  app.openapi(updateTransactionStatusRoute, updateTransactionStatus);
  
  app.openapi(getRecentTransactionsRoute, getRecentTransactionsHandler);
}
