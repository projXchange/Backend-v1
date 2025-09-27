// app.ts (final complete version)
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { rateLimiter } from './middlewares/rate-limiter.middleware';
import { initializePostHog, shutdownPostHog } from './config/posthog';
import { posthogMiddleware } from './middlewares/posthog.middleware';
import { rootRoutes } from './routes/root.route';
import { authUsersRoutes, usersRoutes } from './routes/users.route';
import { adminUsersRoutes } from './routes/admin-users.route';
import { projectsRoutes } from './routes/projects.route';
import { wishlistRoutes } from './routes/wishlists.route';
import { cartRoutes } from './routes/carts.route';
import { reviewsRoutes } from './routes/reviews.route';
import { transactionsRoutes } from './routes/transactions.route';
import { downloadsRoutes } from './routes/downloads.route';

const app = new OpenAPIHono();

// Initialize PostHog
initializePostHog();

// PostHog middleware (should be early in the chain)
app.use('*', posthogMiddleware());

app.use('*', cors({
  origin: ['https://projxchange-backend-v1.vercel.app', 'http://localhost:3000', 'http://localhost:5173', 'https://projxchange-frontend-v1.vercel.app', '*'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  maxAge: 600,
  credentials: true,
}));

// Smart rate limiting based on route patterns
app.use('*', rateLimiter({
  identifier: (c) => {
    const ip = c.req.header('x-forwarded-for') || 
               c.req.header('x-real-ip') || 
               'unknown';
    const userId = c.get('userId') || 'anonymous';
    return `${ip}:${userId}`;
  },
  type: (c) => {
    const path = c.req.path;
    
    // Authentication routes - strictest limits
    if (path.startsWith('/auth/')) return 'auth';
    
    // Admin routes - moderate limits
    if (path.startsWith('/admin/')) return 'admin';
    
    // Upload/project creation routes - moderate limits
    if (path.includes('/projects') && (c.req.method === 'POST' || c.req.method === 'PUT')) return 'upload';
    
    // Public browsing routes - most lenient
    if (path.startsWith('/projects') && c.req.method === 'GET') return 'public';
    
    // Default to general rate limiting
    return 'general';
  }
}));

rootRoutes(app);
authUsersRoutes(app);
usersRoutes(app);
adminUsersRoutes(app);
reviewsRoutes(app);  // Move reviews before projects to avoid /projects/* middleware conflict
projectsRoutes(app);
wishlistRoutes(app);
cartRoutes(app);
transactionsRoutes(app);
downloadsRoutes(app);

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
  tags: [
    { name: 'Authentication', description: 'User authentication and authorization' },
    { name: 'Admin - Users', description: 'Admin operations for user management' },
    { name: 'User Profiles', description: 'User profile management' },
    { name: 'Projects', description: 'Project management and browsing' },
    { name: 'Project Dumps', description: 'Project additional data and media' },
    { name: 'Cart', description: 'Shopping cart functionality' },
    { name: 'Wishlist', description: 'User wishlist management' },
    { name: 'Reviews', description: 'Project reviews and ratings' },
    { name: 'Transactions', description: 'Payment and transaction management' },
    { name: 'Downloads', description: 'Project download tracking' },
    { name: 'Admin - Projects', description: 'Admin operations for projects' },
    { name: 'Admin - Reviews', description: 'Admin review moderation' },
    { name: 'Admin - Transactions', description: 'Admin transaction management' },
  ],
});

app.get('/api/doc', swaggerUI({ url: '/doc' }));

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await shutdownPostHog();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await shutdownPostHog();
  process.exit(0);
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 ProjXChange API Server running on http://localhost:${info.port}`);
  console.log(`📚 API Documentation: http://localhost:${info.port}/api/doc`);
  console.log(`🔗 API Endpoint: http://localhost:${info.port}/doc`);
});
