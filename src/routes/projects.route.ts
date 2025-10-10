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
import { isLoggedIn, requireManager } from '../middlewares/users.middlewares';

// ===== SHARED SCHEMAS =====
const PricingSchema = z.object({
  sale_price: z.number(),
  original_price: z.number(),
  currency: z.enum(["INR", "USD"]),
});

const FilesSchema = z.object({
  source_files: z.array(z.string()).optional(),
  documentation_files: z.array(z.string()).optional(),
});

const RequirementsSchema = z.object({
  system_requirements: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  installation_steps: z.array(z.string()).optional(),
});


const RatingSchema = z.object({
  average_rating: z.number().optional(),
  total_ratings: z.number().optional(),
  rating_distribution: z.record(z.string(), z.number()).optional(),
});

const MessageResponse = z.object({
  message: z.string(),
});

// ===== SHARED RESPONSE SCHEMAS =====
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
  youtube_url: z.string().nullable(),
  pricing: PricingSchema.nullable(),
  delivery_time: z.number(),
  status: z.string(),
  is_featured: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  discount_percentage: z.number().optional(),
  thumbnail: z.string().nullable(),
  images: z.array(z.string()),
  files: FilesSchema.nullable(),
  requirements: RequirementsSchema.nullable(),
  rating: RatingSchema.nullable(),
  view_count: z.number(),
  purchase_count: z.number(),
  download_count: z.number(),
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

// ===== ROUTE DEFINITIONS =====

// 1. CREATE PROJECT - POST /projects
const CreateProjectRequest = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  key_features: z.string().optional(),
  category: z.enum(["web_development", "mobile_development", "desktop_application", "ai_machine_learning", "blockchain", "game_development", "data_science", "devops", "api_backend", "automation_scripts", "ui_ux_design", "other"]).optional(),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  tech_stack: z.array(z.string()).optional(),
  github_url: z.string().url().optional(),
  demo_url: z.string().url().optional(),
  youtube_url: z.string().url().optional(),
  pricing: PricingSchema.optional(),
  delivery_time: z.number().int().min(0).optional(),
  thumbnail: z.string().optional(),
  images: z.array(z.string()).optional(),
  files: FilesSchema.optional(),
  requirements: RequirementsSchema.optional(),
  rating: RatingSchema.optional(),
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

// 2. UPDATE PROJECT - PATCH /projects/{id}
const UpdateProjectRequest = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  key_features: z.string().optional(),
  category: z.enum(["web_development", "mobile_development", "desktop_application", "ai_machine_learning", "blockchain", "game_development", "data_science", "devops", "api_backend", "automation_scripts", "ui_ux_design", "other"]).optional(),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  tech_stack: z.array(z.string()).optional(),
  github_url: z.string().url().optional(),
  demo_url: z.string().url().optional(),
  youtube_url: z.string().url().optional(),
  pricing: PricingSchema.optional(),
  delivery_time: z.number().int().min(0).optional(),
  status: z.enum(["draft", "pending", "approved", "suspended", "archived"]).optional(),
  thumbnail: z.string().optional(),
  images: z.array(z.string()).optional(),
  files: FilesSchema.optional(),
  requirements: RequirementsSchema.optional(),
  rating: RatingSchema.optional(),
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

// 3. GET PROJECT BY ID - GET /projects/{id}
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

// 4. GET PROJECTS WITH FILTERS - GET /projects
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
      sort_by: z.enum(["created_at", "title", "view_count", "purchase_count", "price", "download_count"]).optional(),
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

// 5. GET MY PROJECTS - GET /projects/my
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

// 6. GET FEATURED PROJECTS - GET /projects/featured
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

// 7. DELETE PROJECT - DELETE /projects/{id}
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

// 8. UPDATE PROJECT STATUS (ADMIN) - PATCH /admin/projects/{id}/status
const UpdateProjectStatusRequest = z.object({
  status: z.enum(["draft", "pending", "approved", "suspended", "archived"]),
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
            status: z.enum(["draft", "pending", "approved", "suspended", "archived"]).optional(),
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

// 9. PURCHASE PROJECT - POST /projects/{id}/purchase
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
  // ===== PUBLIC ROUTES (No Authentication Required) =====
  // GET /projects - List all projects with filters
  app.openapi(getProjectsWithFiltersRoute, getProjectsWithFilters);
  
  // GET /projects/{id} - Get project by ID
  app.openapi(getProjectByIdRoute, getProjectById);
  
  // GET /projects/featured - Get featured projects
  app.openapi(getFeaturedProjectsRoute, getFeaturedProjects);

  // ===== PROTECTED ROUTES (Authentication Required) =====
  // GET /projects/my - Get my projects (Users, Admins, Managers)
  app.use('/projects/my', isLoggedIn);
  app.openapi(getMyProjectsRoute, getMyProjects);
  
  // POST /projects - Create new project (Users, Admins, Managers)
  app.use('/projects', isLoggedIn);
  app.openapi(createProjectRoute, createProjectHandler);
  
  // PUT /projects/{id} - Update project (Authenticated users)
  app.use('/projects/*', isLoggedIn);
  app.openapi(updateProjectRoute, updateProjectHandler);
  
  // DELETE /projects/{id} - Delete project (Authenticated users)
  app.openapi(deleteProjectRoute, deleteProjectHandler);
  
  // POST /projects/{id}/purchase - Purchase project (Authenticated users)
  app.openapi(purchaseProjectRoute, purchaseProject);

  // ===== ADMIN ROUTES (Admin/Manager Only) =====
  // PUT /admin/projects/{id}/status - Update project status (Admin/Manager only)
  app.use('/admin/projects/*', isLoggedIn, requireManager);
  app.openapi(updateProjectStatusRoute, updateProjectStatus);
}
