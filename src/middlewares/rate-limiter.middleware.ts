import { Context, Next } from 'hono';
import { rateLimiters, RateLimiter } from '../utils/rate-limiter.util';

export type RateLimitType = 'general' | 'auth' | 'upload' | 'admin' | 'public';

export interface RateLimiterOptions {
  type?: RateLimitType | ((c: Context) => RateLimitType);
  customLimiter?: RateLimiter;
  identifier?: (c: Context) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Rate limiter middleware for Hono
 * @param options Configuration options for the rate limiter
 * @returns Hono middleware function
 */
export function rateLimiter(options: RateLimiterOptions = {}) {
  const {
    type = 'general',
    customLimiter,
    identifier = (c: Context) => {
      // Default identifier: IP address + User ID (if authenticated)
      const ip = c.req.header('x-forwarded-for') || 
                 c.req.header('x-real-ip') || 
                 'unknown';
      const userId = c.get('userId') || 'anonymous';
      return `${ip}:${userId}`;
    },
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return async (c: Context, next: Next) => {
    try {
      // Get the appropriate rate limiter
      const rateLimitType = typeof type === 'function' ? type(c) : type;
      const limiter = customLimiter || rateLimiters[rateLimitType];
      
      // Get identifier for this request
      const requestId = identifier(c);
      
      // Check rate limit
      const result = await limiter.checkLimit(requestId);
      
      // Set rate limit headers
      c.header('X-RateLimit-Limit', limiter['config'].rate.toString());
      c.header('X-RateLimit-Remaining', result.tokensLeft.toString());
      c.header('X-RateLimit-Reset', result.resetTime?.toString() || '');
      
      if (!result.allowed) {
        c.header('Retry-After', Math.ceil((result.resetTime || 0) - Date.now() / 1000).toString());
        
        return c.json({
          success: false,
          message: 'Rate limit exceeded. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.resetTime
        }, 429);
      }
      
      // Continue to next middleware/handler
      await next();
      
    } catch (error) {
      console.error('Rate limiter middleware error:', error);
      // Fail open - continue with request if rate limiter fails
      await next();
    }
  };
}

/**
 * Convenience middleware for different endpoint types
 */
export const rateLimiterMiddleware = {
  // For authentication endpoints (login, register, etc.)
  auth: (options: Omit<RateLimiterOptions, 'type'> = {}) => 
    rateLimiter({ ...options, type: 'auth' }),
  
  // For file upload endpoints
  upload: (options: Omit<RateLimiterOptions, 'type'> = {}) => 
    rateLimiter({ ...options, type: 'upload' }),
  
  // For admin endpoints
  admin: (options: Omit<RateLimiterOptions, 'type'> = {}) => 
    rateLimiter({ ...options, type: 'admin' }),
  
  // For public read endpoints (browsing, etc.)
  public: (options: Omit<RateLimiterOptions, 'type'> = {}) => 
    rateLimiter({ ...options, type: 'public' }),
  
  // For general API endpoints
  general: (options: Omit<RateLimiterOptions, 'type'> = {}) => 
    rateLimiter({ ...options, type: 'general' })
};

export default rateLimiter;
