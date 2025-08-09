import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { rootRoutes } from './routes/root.route';
import { authUsersRoutes } from './routes/users.route';
import { adminUsersRoutes } from './routes/admin-users.route';
import { usersDumpRoutes } from './routes/users-dump.route';

const app = new OpenAPIHono();

app.use('*', cors({
  origin: ['https://projxchange-backend-v1.vercel.app', 'http://localhost:3000', 'http://localhost:5173', 'https://projxchange-frontend-v1.vercel.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
  credentials: true,
}));

rootRoutes(app);
authUsersRoutes(app);
adminUsersRoutes(app);
usersDumpRoutes(app);

app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'ProjXChange API',
    version: '1.0.0',
    description: 'API for ProjXChange platform',
  },
  servers: [
    {
      url: 'https://projxchange-backend-v1.vercel.app/',
      description: 'Production server',
    },
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
});

app.get('/api/doc', swaggerUI({ url: '/doc' }));

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
  console.log(`API Docs at http://localhost:${info.port}/api/doc`);
});
