// routes/projects-dump.route.ts
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { 
  createProjectDumpHandler,
  updateProjectDumpHandler,
  getProjectDumpById,
  getAllProjectDumps,
  deleteProjectDumpHandler
} from '../controllers/projects-dump.controller';
import { isLoggedIn, requireManager } from '../middlewares/users.middlewares';

const FilesSchema = z.object({
  source_files: z.array(z.string()).optional(),
  documentation_files: z.array(z.string()).optional(),
  assets: z.array(z.string()).optional(),
  size_mb: z.number().optional(),
});

const RequirementsSchema = z.object({
  system_requirements: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  installation_steps: z.array(z.string()).optional(),
});

const StatsSchema = z.object({
  total_downloads: z.number().optional(),
  total_views: z.number().optional(),
  total_likes: z.number().optional(),
  completion_rate: z.number().optional(),
});

const RatingSchema = z.object({
  average_rating: z.number().optional(),
  total_ratings: z.number().optional(),
  rating_distribution: z.record(z.string(), z.number()).optional(),
});

const CreateProjectDumpRequest = z.object({
  thumbnail: z.string().optional(),
  images: z.array(z.string()).optional(),
  demo_video: z.string().optional(),
  features: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  files: FilesSchema.optional(),
  requirements: RequirementsSchema.optional(),
  stats: StatsSchema.optional(),
  rating: RatingSchema.optional(),
});

const UpdateProjectDumpRequest = z.object({
  thumbnail: z.string().optional(),
  images: z.array(z.string()).optional(),
  demo_video: z.string().optional(),
  features: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  files: FilesSchema.optional(),
  requirements: RequirementsSchema.optional(),
  stats: StatsSchema.optional(),
  rating: RatingSchema.optional(),
});

const ProjectDumpResponse = z.object({
  id: z.string(),
  thumbnail: z.string().nullable(),
  images: z.array(z.string()),
  demo_video: z.string().nullable(),
  features: z.array(z.string()),
  tags: z.array(z.string()),
  files: FilesSchema.nullable(),
  requirements: RequirementsSchema.nullable(),
  stats: StatsSchema.nullable(),
  rating: RatingSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const MessageResponse = z.object({
  message: z.string(),
});

const createProjectDumpRoute = createRoute({
  method: 'post',
  path: '/projects/{id}/dump',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: CreateProjectDumpRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Project dump created successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            dump: ProjectDumpResponse,
          }),
        },
      },
    },
  },
  tags: ['Project Dumps'],
});

const updateProjectDumpRoute = createRoute({
  method: 'patch',
  path: '/projects/{id}/dump',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateProjectDumpRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Project dump updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            dump: ProjectDumpResponse,
          }),
        },
      },
    },
  },
  tags: ['Project Dumps'],
});

const getProjectDumpByIdRoute = createRoute({
  method: 'get',
  path: '/projects/{id}/dump',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Project dump fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            dump: ProjectDumpResponse,
          }),
        },
      },
    },
  },
  tags: ['Project Dumps'],
});

const getAllProjectDumpsRoute = createRoute({
  method: 'get',
  path: '/admin/projects/dumps',
  responses: {
    200: {
      description: 'Project dumps fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            dumps: z.array(ProjectDumpResponse),
            total: z.number(),
          }),
        },
      },
    },
  },
  tags: ['Admin - Project Dumps'],
});

const deleteProjectDumpRoute = createRoute({
  method: 'delete',
  path: '/projects/{id}/dump',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Project dump deleted successfully',
      content: {
        'application/json': {
          schema: MessageResponse,
        },
      },
    },
  },
  tags: ['Project Dumps'],
});

export function projectsDumpRoutes(app: OpenAPIHono) {
  // Protected routes
  app.use('/projects/*/dump', isLoggedIn);
  app.openapi(createProjectDumpRoute, createProjectDumpHandler);
  app.openapi(updateProjectDumpRoute, updateProjectDumpHandler);
  app.openapi(getProjectDumpByIdRoute, getProjectDumpById);
  app.openapi(deleteProjectDumpRoute, deleteProjectDumpHandler);

  // Admin routes
  app.use('/admin/projects/dumps', isLoggedIn, requireManager);
  app.openapi(getAllProjectDumpsRoute, getAllProjectDumps);
}
