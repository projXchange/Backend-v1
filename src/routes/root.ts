import { createRoute, z } from '@hono/zod-openapi';

// GET /
export const rootRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      description: 'Respond with welcome message',
      content: { 'text/plain': { schema: z.string() } },
    },
  },
});
export const rootHandler = (c:any) => c.text('Hello API!');

// GET /status
export const statusRoute = createRoute({
  method: 'get',
  path: '/status',
  responses: {
    200: {
      description: 'API status info',
      content: {
        'application/json': { schema: z.object({ status: z.string(), uptime: z.number() }) },
      },
    },
  },
});
export const statusHandler = (c:any) => {
    try {
        const uptime = process.uptime();
        return c.json({ status: 'OK', uptime });
    } catch (error) {
        return c.json({ status: 'Error', message: 'Failed to fetch status' }, 500);
    }
};
