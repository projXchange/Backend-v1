import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { 
  updateUserStatus, 
  deleteUser, 
  getAllUsers, 
  getUserById 
} from '../controllers/admin-users.controller';
import { isLoggedIn, requireManager } from '../middlewares/users.middlewares';

const MessageResponse = z.object({
  message: z.string(),
});

// ===== SHARED RESPONSE SCHEMAS =====
const UserResponse = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string().nullable(),
  user_type: z.string(),
  verification_status: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  email_verified: z.boolean(),
});

const UsersListResponse = z.object({
  users: z.array(UserResponse),
  total: z.number(),
});

// ===== ROUTE DEFINITIONS =====

// 1. UPDATE USER STATUS - PATCH /admin/users/{id}/status
const UpdateUserStatusRequest = z.object({
  verification_status: z.enum(["pending", "verified", "rejected"]).optional(),
  email_verified: z.boolean().optional(),
});

const updateUserStatusRoute = createRoute({
  method: 'patch',
  path: '/admin/users/{id}/status',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateUserStatusRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User status updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            user: UserResponse,
          }),
        },
      },
    },
  },
  tags: ['Admin - Users'],
});

const deleteUserRoute = createRoute({
  method: 'delete',
  path: '/admin/users/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'User deleted successfully',
      content: {
        'application/json': {
          schema: MessageResponse,
        },
      },
    },
  },
  tags: ['Admin - Users'],
});

const getAllUsersRoute = createRoute({
  method: 'get',
  path: '/admin/users',
  request: {
    query: z.object({
      include_deleted: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Users fetched successfully',
      content: {
        'application/json': {
          schema: UsersListResponse,
        },
      },
    },
  },
  tags: ['Admin - Users'],
});

const getUserByIdRoute = createRoute({
  method: 'get',
  path: '/admin/users/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'User fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            user: UserResponse,
          }),
        },
      },
    },
  },
  tags: ['Admin - Users'],
});


export function adminUsersRoutes(app: OpenAPIHono) {
  app.use('/admin/users/*', isLoggedIn, requireManager);
  
  app.openapi(updateUserStatusRoute, updateUserStatus);
  app.openapi(deleteUserRoute, deleteUser);
  app.openapi(getAllUsersRoute, getAllUsers);
  app.openapi(getUserByIdRoute, getUserById);
}