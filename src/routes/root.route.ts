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

const rootHandler = (c: any) => c.json({ message: 'Welcome to ProjXChange API!' });

export function rootRoutes(app: OpenAPIHono) {
  app.openapi(rootRoute, rootHandler);
}