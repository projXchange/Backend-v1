import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { 
  createUserProfile,
  updateUserProfile,
  getUserProfile,
  getAllUserProfiles,
  deleteUserProfile,
  getMyProfile
} from '../controllers/users-dump.controller';
import { isLoggedIn, requireManager } from '../middlewares/users.middlewares';

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

const UserProfileResponse = z.object({
  id: z.string(),
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
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const ProfilesListResponse = z.object({
  profiles: z.array(UserProfileResponse),
  total: z.number(),
});

const MessageResponse = z.object({
  message: z.string(),
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

export function usersDumpRoutes(app: OpenAPIHono) {
  app.use('/users/profile/*', isLoggedIn);
  app.use('/admin/users/profiles/*', isLoggedIn, requireManager);
  
  app.openapi(getMyProfileRoute, getMyProfile);        // /users/profile/me (specific)
  app.openapi(createUserProfileRoute, createUserProfile); // /users/profile (base)
  app.openapi(getUserProfileRoute, getUserProfile);    // /users/profile/{id} (parameterized)
  app.openapi(updateUserProfileRoute, updateUserProfile); // /users/profile/{id}
  app.openapi(deleteUserProfileRoute, deleteUserProfile); // /users/profile/{id}
  app.openapi(getAllUserProfilesRoute, getAllUserProfiles);
}