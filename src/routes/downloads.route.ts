// routes/downloads.route.ts
import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { 
  getUserDownloads,
  downloadProject,
  getProjectDownloadStats,
  getUserDownloadHistoryHandler
} from '../controllers/downloads.controller';
import { isLoggedIn, requireManager } from '../middlewares/users.middlewares';

const ProjectInDownloadResponse = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  author_id: z.string(),
  pricing: z.any().nullable(),
});

const DownloadResponse = z.object({
  id: z.string(),
  project_id: z.string(),
  download_type: z.string(),
  created_at: z.string(),
  project: ProjectInDownloadResponse,
});

const DownloadStatsResponse = z.object({
  total_downloads: z.number(),
  unique_downloads: z.number(),
  full_downloads: z.number(),
  demo_downloads: z.number(),
  preview_downloads: z.number(),
});

const MessageResponse = z.object({
  message: z.string(),
});

const getUserDownloadsRoute = createRoute({
  method: 'get',
  path: '/downloads/my',
  responses: {
    200: {
      description: 'User downloads fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            downloads: z.array(DownloadResponse),
            total: z.number(),
          }),
        },
      },
    },
  },
  tags: ['Downloads'],
});

// 2. DOWNLOAD PROJECT - POST /projects/{project_id}/download
const DownloadProjectRequest = z.object({
  download_type: z.enum(["full", "demo", "preview"]).optional(),
});

const downloadProjectRoute = createRoute({
  method: 'post',
  path: '/projects/{project_id}/download',
  request: {
    params: z.object({
      project_id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: DownloadProjectRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Download recorded successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            download_id: z.string(),
            download_type: z.string(),
          }),
        },
      },
    },
  },
  tags: ['Downloads'],
});

const getProjectDownloadStatsRoute = createRoute({
  method: 'get',
  path: '/projects/{project_id}/download-stats',
  request: {
    params: z.object({
      project_id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Project download stats fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            project_id: z.string(),
            stats: DownloadStatsResponse,
          }),
        },
      },
    },
  },
  tags: ['Downloads'],
});

const getUserDownloadHistoryRoute = createRoute({
  method: 'get',
  path: '/projects/{project_id}/download-history',
  request: {
    params: z.object({
      project_id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'User download history fetched successfully',
      content: {
        'application/json': {
          schema: z.object({
            project_id: z.string(),
            download_history: z.array(DownloadResponse),
            total: z.number(),
          }),
        },
      },
    },
  },
  tags: ['Downloads'],
});

export function downloadsRoutes(app: OpenAPIHono) {
  // Protected routes
  app.use('/downloads/*', isLoggedIn);
  app.openapi(getUserDownloadsRoute, getUserDownloads);
  
  app.use('/projects/*/download', isLoggedIn);
  app.openapi(downloadProjectRoute, downloadProject);
  
  app.use('/projects/*/download-stats', isLoggedIn);
  app.openapi(getProjectDownloadStatsRoute, getProjectDownloadStats);
  
  app.use('/projects/*/download-history', isLoggedIn);
  app.openapi(getUserDownloadHistoryRoute, getUserDownloadHistoryHandler);
}
