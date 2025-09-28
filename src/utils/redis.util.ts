import { Redis } from '@upstash/redis';
import { logger } from './logger';

// Upstash Redis configuration
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Test connection on startup
redis.ping()
  .then(() => {
    logger.db('Upstash Redis connected successfully', {
      service: 'redis',
      status: 'connected'
    });
  })
  .catch((err: any) => {
    logger.error('Upstash Redis connection error', err, {
      service: 'redis',
      status: 'failed',
      troubleshooting: 'Make sure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set in your environment variables'
    });
  });

export { redis };
export default redis;
