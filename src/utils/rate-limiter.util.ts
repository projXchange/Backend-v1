import { redis } from './redis.util';
import { logger } from './logger';

export const LUA_TOKEN_BUCKET = `
local tokens_key = KEYS[1]
local timestamp_key = KEYS[2]

local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local fill_time = capacity/rate
local ttl = math.floor(fill_time*2)

-- Get both values in a single mget operation (1 Redis command)
local tokens_data = redis.call("mget", tokens_key, timestamp_key)
local last_tokens = tonumber(tokens_data[1])
local last_refreshed = tonumber(tokens_data[2])

if last_tokens == nil then
  last_tokens = capacity
end

if last_refreshed == nil then
  last_refreshed = 0
end

local delta = math.max(0, now-last_refreshed)
local filled_tokens = math.min(capacity, last_tokens+(delta*rate))
local allowed = filled_tokens >= requested
local new_tokens = filled_tokens
if allowed then
  new_tokens = filled_tokens - requested
end

-- Set both values in a single mset operation (1 Redis command)
redis.call("mset", tokens_key, new_tokens, timestamp_key, now)
-- Set expiration for both keys (2 Redis commands)
redis.call("expire", tokens_key, ttl)
redis.call("expire", timestamp_key, ttl)

return { allowed, new_tokens }
`;

export interface RateLimitConfig {
  rate: number; // requests per second
  capacity: number; // burst capacity
  keyPrefix: string; // prefix for Redis keys
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(identifier: string, requested: number = 1): Promise<{
    allowed: boolean;
    tokensLeft: number;
    resetTime?: number;
  }> {
    try {
      const tokensKey = `${this.config.keyPrefix}.tokens.${identifier}`;
      const timestampKey = `${this.config.keyPrefix}.timestamp.${identifier}`;
      
      const keys = [tokensKey, timestampKey];
      const args = [
        this.config.rate.toString(),
        this.config.capacity.toString(),
        Math.floor(Date.now() / 1000).toString(),
        requested.toString()
      ];

      // Upstash Redis eval syntax: eval(script, keys, args)
      const result = await redis.eval(LUA_TOKEN_BUCKET, keys, args) as [number, number];
      const [allowed, tokensLeft] = result;

      return {
        allowed: Boolean(allowed),
        tokensLeft: Number(tokensLeft),
        resetTime: this.calculateResetTime()
      };
    } catch (error) {
      logger.error('Rate limiter error', error as Error, {
        service: 'rate-limiter',
        identifier,
        config: this.config.keyPrefix,
        action: 'fail-open'
      });
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        tokensLeft: this.config.capacity
      };
    }
  }

  private calculateResetTime(): number {
    return Math.floor(Date.now() / 1000) + Math.floor(this.config.capacity / this.config.rate);
  }
}

// Predefined rate limiters for different types of endpoints
export const rateLimiters = {
  // General API rate limiter - 100 requests per minute with burst of 200
  general: new RateLimiter({
    rate: 100,
    capacity: 200,
    keyPrefix: 'rate_limit:general'
  }),

  // Authentication endpoints - 5 requests per minute with burst of 10
  auth: new RateLimiter({
    rate: 5,
    capacity: 10,
    keyPrefix: 'rate_limit:auth'
  }),

  // File upload endpoints - 10 requests per minute with burst of 20
  upload: new RateLimiter({
    rate: 10,
    capacity: 20,
    keyPrefix: 'rate_limit:upload'
  }),

  // Admin endpoints - 50 requests per minute with burst of 100
  admin: new RateLimiter({
    rate: 50,
    capacity: 100,
    keyPrefix: 'rate_limit:admin'
  }),

  // Public read endpoints - 200 requests per minute with burst of 400
  public: new RateLimiter({
    rate: 200,
    capacity: 400,
    keyPrefix: 'rate_limit:public'
  })
};

export default RateLimiter;
