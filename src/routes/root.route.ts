import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';

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
            timestamp: z.string()
          }) 
        } 
      },
    },
  },
  tags: ['General'],
});

const rootHandler = (c: any) => c.json({ message: 'Welcome to ProjXChange API!' });

const healthHandler = async (c: any) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
};

export function rootRoutes(app: OpenAPIHono) {
  app.openapi(rootRoute, rootHandler);
  app.openapi(healthRoute, healthHandler);
}