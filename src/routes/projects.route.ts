// routes/projects.route.ts
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { 
  createProjectHandler,
  updateProjectHandler,
  getProjectById,
  getProjectsWithFilters,
  getMyProjects,
  getFeaturedProjects,
  deleteProjectHandler,
  updateProjectStatus,
  purchaseProject
} from '../controllers/projects.controller';
import { isLoggedIn, requireManager, requireSeller } from '../middlewares/users.middlewares';

const PricingSchema = z.object({
  sale_price: z.number(),
  original_price: z.number(),
  currency: z.enum(["INR", "USD"]),
});

// Dump schemas
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

const CreateProjectRequest = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  key_features: z.string().optional(),
  category: z.enum(["web_development", "mobile_development", "desktop_application", "ai_machine_learning", "blockchain", "game_development", "data_science", "devops", "api_backend", "automation_scripts", "ui_ux_design", "other"]).optional(),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  tech_stack: z.array(z.string()).optional(),
  github_url: z.string().url().optional(),
  demo_url: z.string().url().optional(),
  documentation: z.string().optional(),
  pricing: PricingSchema.optional(),
  delivery_time: z.number().int().min(0).optional(),
  // Dump fields
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

const UpdateProjectRequest = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  key_features: z.string().optional(),
  category: z.enum(["web_development", "mobile_development", "desktop_application", "ai_machine_learning", "blockchain", "game_development", "data_science", "devops", "api_backend", "automation_scripts", "ui_ux_design", "other"]).optional(),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  tech_stack: z.array(z.string()).optional(),
  github_url: z.string().url().optional(),
  demo_url: z.string().url().optional(),
  documentation: z.string().optional(),
  pricing: PricingSchema.optional(),
  delivery_time: z.number().int().min(0).optional(),
  status: z.enum(["draft", "pending_review", "approved", "published", "suspended", "archived"]).optional(),
  // Dump fields
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

const ProjectResponse = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  key_features: z.string().nullable(),
  category: z.string(),
  author_id: z.string(),
  buyers: z.array(z.string()),
  difficulty_level: z.string(),
  tech_stack: z.array(z.string()),
  github_url: z.string().nullable(),
  demo_url: z.string().nullable(),
  documentation: z.string().nullable(),
  pricing: PricingSchema.nullable(),
  delivery_time: z.number(),
  status: z.string(),
  is_featured: z.boolean(),
  view_count: z.number(),
  purchase_count: z.number(),
  download_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  discount_percentage: z.number().optional(),
  // Dump fields
  thumbnail: z.string().nullable(),
  images: z.array(z.string()),
  demo_video: z.string().nullable(),
  features: z.array(z.string()),
  tags: z.array(z.string()),
  files: FilesSchema.nullable(),
  requirements: RequirementsSchema.nullable(),
  stats: StatsSchema.nullable(),
  rating: RatingSchema.nullable(),
});

const ProjectsListResponse = z.object({
  data: z.array(ProjectResponse),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});

const MessageResponse = z.object({
  message: z.string(),
});


const createProjectRoute = createRoute({
  method: 'post',
  path: '/projects',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateProjectRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Project created successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            project: ProjectResponse,
          }),
        },
      },
    },
  },
  tags: ['Projects'],
});

const updateProjectRoute = createRoute({
  method: 'patch',
  path: '/projects/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateProjectRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Project updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            project: ProjectResponse,
          }),
        },
      },
    },
  },
  tags: ['Projects'],
});

const getProjectByIdRoute = createRoute({
  method: 'get',
  path: '/projects/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Project fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            project: ProjectResponse,
            user_status: z.object({
              has_purchased: z.boolean(),
              in_wishlist: z.boolean(),
              in_cart: z.boolean(),
            }),
          }),
        },
      },
    },
  },
  tags: ['Projects'],
});

const getProjectsWithFiltersRoute = createRoute({
  method: 'get',
  path: '/projects',
  request: {
    query: z.object({
      category: z.string().optional(),
      author_id: z.string().optional(),
      difficulty_level: z.string().optional(),
      tech_stack: z.string().optional(),
      status: z.string().optional(),
      is_featured: z.string().optional(),
      min_price: z.string().optional(),
      max_price: z.string().optional(),
      currency: z.enum(["INR", "USD"]).optional(),
      search: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
      sort_by: z.enum(["created_at", "title", "view_count", "purchase_count", "price"]).optional(),
      sort_order: z.enum(["asc", "desc"]).optional(),
    }),
  },
  responses: {
    200: {
      description: 'Projects fetched successfully',
      content: {
        'application/json': {
          schema: ProjectsListResponse,
        },
      },
    },
  },
  tags: ['Projects'],
});

const getMyProjectsRoute = createRoute({
  method: 'get',
  path: '/projects/my',
  responses: {
    200: {
      description: 'My projects fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            projects: z.array(ProjectResponse),
            total: z.number(),
          }),
        },
      },
    },
  },
  tags: ['Projects'],
});

const getFeaturedProjectsRoute = createRoute({
  method: 'get',
  path: '/projects/featured',
  request: {
    query: z.object({
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Featured projects fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            projects: z.array(ProjectResponse),
            total: z.number(),
          }),
        },
      },
    },
  },
  tags: ['Projects'],
});

const deleteProjectRoute = createRoute({
  method: 'delete',
  path: '/projects/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Project deleted successfully',
      content: {
        'application/json': {
          schema: MessageResponse,
        },
      },
    },
  },
  tags: ['Projects'],
});

const updateProjectStatusRoute = createRoute({
  method: 'patch',
  path: '/admin/projects/{id}/status',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            status: z.enum(["draft", "pending_review", "approved", "published", "suspended", "archived"]).optional(),
            is_featured: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Project status updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            project: ProjectResponse,
          }),
        },
      },
    },
  },
  tags: ['Admin - Projects'],
});

const purchaseProjectRoute = createRoute({
  method: 'post',
  path: '/projects/{id}/purchase',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Project purchased successfully',
      content: {
        'application/json': {
          schema: MessageResponse,
        },
      },
    },
  },
  tags: ['Projects'],
});


export function projectsRoutes(app: OpenAPIHono) {
  // Public routes
  app.openapi(getProjectsWithFiltersRoute, getProjectsWithFilters);
  app.openapi(getProjectByIdRoute, getProjectById);
  app.openapi(getFeaturedProjectsRoute, getFeaturedProjects);

  // Protected routes for sellers
  app.use('/projects/my', isLoggedIn, requireSeller);
  app.openapi(getMyProjectsRoute, getMyProjects);
  
  app.use('/projects', isLoggedIn, requireSeller);
  app.openapi(createProjectRoute, createProjectHandler);
  
  app.use('/projects/*', isLoggedIn);
  app.openapi(updateProjectRoute, updateProjectHandler);
  app.openapi(deleteProjectRoute, deleteProjectHandler);
  app.openapi(purchaseProjectRoute, purchaseProject);

  // Admin routes
  app.use('/admin/projects/*', isLoggedIn, requireManager);
  app.openapi(updateProjectStatusRoute, updateProjectStatus);
}
