import { createRoute, z } from '@hono/zod-openapi';
import { signup, signin, logout, forgotPassword, resetPassword } from '../controllers/users.controller';

// Zod schemas for request/response validation
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

// POST /signup
export const signupRoute = createRoute({
  method: 'post',
  path: '/signup',
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
    400: {
      description: 'Bad request - validation error or email exists',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
  },
  tags: ['Authentication'],
});

// POST /signin
export const signinRoute = createRoute({
  method: 'post',
  path: '/signin',
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
    400: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
  },
  tags: ['Authentication'],
});

// POST /logout
export const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
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

// POST /forgot-password
export const forgotPasswordRoute = createRoute({
  method: 'post',
  path: '/forgot-password',
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
    400: {
      description: 'Email not registered',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
  },
  tags: ['Authentication'],
});

// POST /reset-password/:token
export const resetPasswordRoute = createRoute({
  method: 'post',
  path: '/reset-password/{token}',
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
    400: {
      description: 'Invalid or expired token',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
  },
  tags: ['Authentication'],
});

// Export handlers
export {
  signup as signupHandler,
  signin as signinHandler,
  logout as logoutHandler,
  forgotPassword as forgotPasswordHandler,
  resetPassword as resetPasswordHandler,
};
