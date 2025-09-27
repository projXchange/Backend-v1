import { Redis } from '@upstash/redis';

// Upstash Redis configuration
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Test connection on startup
redis.ping()
  .then(() => {
    console.log('✅ Upstash Redis connected successfully');
  })
  .catch((err: any) => {
    console.error('❌ Upstash Redis connection error:', err);
    console.log('Make sure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set in your environment variables');
  });

export { redis };
export default redis;
