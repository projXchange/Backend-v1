import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { serve } from '@hono/node-server';
import { 
  rootRoute, 
  rootHandler, 
  statusRoute, 
  statusHandler,
  signupRoute,
  signupHandler,
  signinRoute,
  signinHandler,
  logoutRoute,
  logoutHandler,
  forgotPasswordRoute,
  forgotPasswordHandler,
  resetPasswordRoute,
  resetPasswordHandler,
} from './routes';

const app = new OpenAPIHono();

// Root routes
app.openapi(rootRoute, rootHandler);
app.openapi(statusRoute, statusHandler);

// Auth routes
app.openapi(signupRoute, signupHandler);
app.openapi(signinRoute, signinHandler);
app.openapi(logoutRoute, logoutHandler);
app.openapi(forgotPasswordRoute, forgotPasswordHandler);
app.openapi(resetPasswordRoute, resetPasswordHandler);

// Serve OpenAPI spec at /doc
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'ProjXChange API',
    version: '1.0.0',
    description: 'API for ProjXChange platform with authentication',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
});

// Serve Swagger UI at /api/doc
app.get('/api/doc', swaggerUI({ url: '/doc' }));

// Start server
serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
  console.log(`API Docs at http://localhost:${info.port}/api/doc`);
});
