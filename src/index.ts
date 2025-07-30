import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/', (c) => c.text('Hello API!'));

// This part is for local development. It will not run on Vercel.
// Vercel sets NODE_ENV to 'production' by default.
if (process.env.NODE_ENV === 'development') {
  serve({
    fetch: app.fetch,
    port: 3000,
  });
  console.log('Server is running on port 3000, can visit http://localhost:3000');
}

export default app;
