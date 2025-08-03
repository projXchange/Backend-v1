import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { 
  signup, 
  signin, 
  logout, 
  forgotPassword, 
  resetPassword 
} from '../controllers/users.controller';

// Schemas
const SignupRequest = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3),
  full_name: z.string().optional(),
});

const SigninRequest = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const ForgotPasswordRequest = z.object({
  email: z.string().email(),
});

const ResetPasswordRequest = z.object({
  password: z.string().min(6),
});

const UserResponse = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  full_name: z.string().nullable(),
  user_type: z.string(),
  verification_status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  email_verified: z.boolean(),
});

const AuthResponse = z.object({
  user: UserResponse,
  accessToken: z.string(),
  refreshToken: z.string(),
});

const ErrorResponse = z.object({
  error: z.string(),
});

const MessageResponse = z.object({
  message: z.string(),
});

// Route definitions
const signupRoute = createRoute({
  method: 'post',
  path: '/auth/signup',
  request: {
    body: {
      content: {
        'application/json': {
          schema: SignupRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User created successfully',
      content: {
        'application/json': {
          schema: AuthResponse,
        },
      },
    },
  },
  tags: ['Authentication'],
});

const signinRoute = createRoute({
  method: 'post',
  path: '/auth/signin',
  request: {
    body: {
      content: {
        'application/json': {
          schema: SigninRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User signed in successfully',
      content: {
        'application/json': {
          schema: AuthResponse,
        },
      },
    },
  },
  tags: ['Authentication'],
});

const logoutRoute = createRoute({
  method: 'post',
  path: '/auth/logout',
  responses: {
    200: {
      description: 'User logged out successfully',
      content: {
        'application/json': {
          schema: MessageResponse,
        },
      },
    },
  },
  tags: ['Authentication'],
});

const forgotPasswordRoute = createRoute({
  method: 'post',
  path: '/auth/forgot-password',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ForgotPasswordRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Reset email sent successfully',
      content: {
        'application/json': {
          schema: MessageResponse,
        },
      },
    },
  },
  tags: ['Authentication'],
});

const resetPasswordRoute = createRoute({
  method: 'post',
  path: '/auth/reset-password/{token}',
  request: {
    params: z.object({
      token: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: ResetPasswordRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password reset successfully',
      content: {
        'application/json': {
          schema: AuthResponse,
        },
      },
    },
  },
  tags: ['Authentication'],
});

// Register all auth routes
export function authUsersRoutes(app: OpenAPIHono) {
  app.openapi(signupRoute, signup);
  app.openapi(signinRoute, signin);
  app.openapi(logoutRoute, logout);
  app.openapi(forgotPasswordRoute, forgotPassword);
  app.openapi(resetPasswordRoute, resetPassword);
}
