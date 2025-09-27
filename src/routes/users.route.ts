import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { 
  signup, 
  signin, 
  logout, 
  forgotPassword, 
  resetPassword,
  createUserProfile,
  updateUserProfile,
  getUserProfile,
  getAllUserProfiles,
  deleteUserProfile,
  getMyProfile
} from '../controllers/users.controller';
import { isLoggedIn, requireManager } from '../middlewares/users.middlewares';
import {
  trackUserSignup,
  trackUserSignin,
  trackUserLogout,
  trackPasswordReset,
  trackProfileCreation
} from '../middlewares/posthog-tracking.middleware';

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
  created_at: z.string(),
  updated_at: z.string(),
  email_verified: z.boolean(),
});

const AuthResponse = z.object({
  user: UserResponse,
  accessToken: z.string(),
  refreshToken: z.string(),
});

const UserProfileResponse = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string().nullable(),
  user_type: z.string(),
  verification_status: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  email_verified: z.boolean(),
  rating: z.number(),
  total_sales: z.number(),
  total_purchases: z.number(),
  experience_level: z.string(),
  avatar: z.string().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  social_links: z.record(z.string(), z.string()).nullable(),
  skills: z.array(z.string()),
});

const ProfilesListResponse = z.object({
  profiles: z.array(UserProfileResponse),
  total: z.number(),
});

// ===== ROUTE DEFINITIONS =====

// 1. SIGNUP - POST /auth/signup
const SignupRequest = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().optional(),
});

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

// 2. SIGNIN - POST /auth/signin
const SigninRequest = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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

// 4. FORGOT PASSWORD - POST /auth/forgot-password
const ForgotPasswordRequest = z.object({
  email: z.string().email(),
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

// 5. RESET PASSWORD - POST /auth/reset-password/{token}
const ResetPasswordRequest = z.object({
  password: z.string().min(6),
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

// 7. CREATE USER PROFILE - POST /users/profile
const UserProfileRequest = z.object({
  rating: z.number().optional(),
  total_sales: z.number().optional(),
  total_purchases: z.number().optional(),
  experience_level: z.enum(["beginner", "intermediate", "expert"]).optional(),
  avatar: z.string().optional(), // base64 image
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  social_links: z.record(z.string(), z.string()).optional(),
  skills: z.array(z.string()).optional(),
});

const createUserProfileRoute = createRoute({
  method: 'post',
  path: '/users/profile',
  request: {
    body: {
      content: {
        'application/json': {
          schema: UserProfileRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User profile created successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            profile: UserProfileResponse,
          }),
        },
      },
    },
  },
  tags: ['User Profiles'],
});

const updateUserProfileRoute = createRoute({
  method: 'patch',
  path: '/users/profile/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UserProfileRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User profile updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            profile: UserProfileResponse,
          }),
        },
      },
    },
  },
  tags: ['User Profiles'],
});

const getUserProfileRoute = createRoute({
  method: 'get',
  path: '/users/profile/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'User profile fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            profile: UserProfileResponse,
          }),
        },
      },
    },
  },
  tags: ['User Profiles'],
});

const getAllUserProfilesRoute = createRoute({
  method: 'get',
  path: '/admin/users/profiles',
  request: {
    query: z.object({
      include_deleted: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'User profiles fetched successfully',
      content: {
        'application/json': {
          schema: ProfilesListResponse,
        },
      },
    },
  },
  tags: ['Admin - User Profiles'],
});

const deleteUserProfileRoute = createRoute({
  method: 'delete',
  path: '/users/profile/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'User profile deleted successfully',
      content: {
        'application/json': {
          schema: MessageResponse,
        },
      },
    },
  },
  tags: ['User Profiles'],
});

const getMyProfileRoute = createRoute({
  method: 'get',
  path: '/users/profile/me',
  responses: {
    200: {
      description: 'My profile fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            profile: UserProfileResponse,
          }),
        },
      },
    },
  },
  tags: ['User Profiles'],
});

export function authUsersRoutes(app: OpenAPIHono) {
  app.use('/auth/signup', trackUserSignup());
  app.openapi(signupRoute, signup);
  
  app.use('/auth/signin', trackUserSignin());
  app.openapi(signinRoute, signin);
  
  app.use('/auth/logout', trackUserLogout());
  app.openapi(logoutRoute, logout);
  
  app.use('/auth/forgot-password', trackPasswordReset());
  app.openapi(forgotPasswordRoute, forgotPassword);
  
  app.use('/auth/reset-password/*', trackPasswordReset());
  app.openapi(resetPasswordRoute, resetPassword);
}

export function usersRoutes(app: OpenAPIHono) {
  // Profile routes
  app.use('/users/profile/*', isLoggedIn);
  app.use('/admin/users/profiles/*', isLoggedIn, requireManager);
  
  app.openapi(getMyProfileRoute, getMyProfile);        // /users/profile/me (specific)
  
  app.use('/users/profile', trackProfileCreation());
  app.openapi(createUserProfileRoute, createUserProfile); // /users/profile (base)
  
  app.openapi(getUserProfileRoute, getUserProfile);    // /users/profile/{id} (parameterized)
  app.openapi(updateUserProfileRoute, updateUserProfile); // /users/profile/{id}
  app.openapi(deleteUserProfileRoute, deleteUserProfile); // /users/profile/{id}
  app.openapi(getAllUserProfilesRoute, getAllUserProfiles);
}
