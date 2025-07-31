import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { serve } from '@hono/node-server';
import { rootRoute, rootHandler, statusRoute, statusHandler } from './routes';

const app = new OpenAPIHono();

app.openapi(rootRoute, rootHandler);
app.openapi(statusRoute, statusHandler);

// Serve OpenAPI spec at /doc
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0',
  },
});

// Serve Swagger UI at /api/doc
app.get('/api/doc', swaggerUI({ url: '/doc' }));

// Start server
serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
  console.log(`API Docs at http://localhost:${info.port}/api/doc`);
});
