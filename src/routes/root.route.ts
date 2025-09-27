import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { checkPostHogHealth } from '../config/posthog';

const rootRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      description: 'Welcome message',
      content: { 
        'application/json': { 
          schema: z.object({ message: z.string() }) 
        } 
      },
    },
  },
  tags: ['General'],
});

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  responses: {
    200: {
      description: 'Health check status',
      content: { 
        'application/json': { 
          schema: z.object({ 
            status: z.string(),
            timestamp: z.string(),
            services: z.object({
              posthog: z.object({
                status: z.string(),
                error: z.string().optional()
              })
            })
          }) 
        } 
      },
    },
  },
  tags: ['General'],
});

const rootHandler = (c: any) => c.json({ message: 'Welcome to ProjXChange API!' });

const healthHandler = async (c: any) => {
  const posthogHealth = await checkPostHogHealth();
  
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      posthog: posthogHealth
    }
  });
};

export function rootRoutes(app: OpenAPIHono) {
  app.openapi(rootRoute, rootHandler);
  app.openapi(healthRoute, healthHandler);
}