import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/', (c) => c.text('Hello API!'));

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
