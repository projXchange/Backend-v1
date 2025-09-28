import { Context, Next } from 'hono';
import { logger, LogContext } from '../utils/logger';
import crypto from 'crypto';

// Extend Hono context to include request ID and logger
declare module 'hono' {
  interface Context {
    requestId: string;
    logger: typeof logger;
  }
}

// Generate a unique request ID
const generateRequestId = (): string => {
  return crypto.randomBytes(8).toString('hex');
};

// Get client IP address from various headers
const getClientIP = (c: Context): string => {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-client-ip') ||
    'unknown'
  );
};

// Get user agent
const getUserAgent = (c: Context): string => {
  return c.req.header('user-agent') || 'unknown';
};

// Determine if we should skip logging for certain paths
const shouldSkipLogging = (path: string): boolean => {
  const skipPaths = [
    '/health',
    '/ping',
    '/favicon.ico',
    '/robots.txt',
  ];
  
  return skipPaths.some(skipPath => path === skipPath);
};

// Extract useful request information
const getRequestInfo = (c: Context) => {
  return {
    method: c.req.method,
    url: c.req.url,
    path: c.req.path,
    query: c.req.query(),
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
    referer: c.req.header('referer'),
    contentType: c.req.header('content-type'),
    contentLength: c.req.header('content-length'),
  };
};

// Helper function to safely extract request body info for debugging (without consuming the stream)
const getRequestBodyInfoForDebug = (c: Context): string => {
  const contentType = c.req.header('content-type') || '';
  const contentLength = c.req.header('content-length') || '0';
  
  if (c.req.method === 'GET') return '';
  if (!contentType.includes('application/json')) return ` | Body: ${contentType} (${contentLength} bytes)`;
  
  return ` | Body: JSON (${contentLength} bytes)`;
};

// Main logging middleware
export const loggingMiddleware = () => {
  return async (c: Context, next: Next) => {
    // Skip logging for certain paths
    if (shouldSkipLogging(c.req.path)) {
      await next();
      return;
    }

    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Add request ID to context
    c.requestId = requestId;
    
    // Create child logger with request context
    const requestInfo = getRequestInfo(c);
    const childLogger = logger.child({
      requestId,
      ...requestInfo,
    });
    
    // Add logger to context for use in controllers
    c.logger = childLogger;

    // Log incoming request with useful debug info
    const queryParams = c.req.query() ? ` | Query: ${JSON.stringify(c.req.query())}` : '';
    const authHeader = c.req.header('authorization') ? ' | Auth: Bearer ***' : '';
    const requestBody = getRequestBodyInfoForDebug(c);
    
    childLogger.info(`🚀 ${requestInfo.method} ${requestInfo.path}${queryParams}${requestBody}${authHeader} | IP: ${requestInfo.ip} | ID: ${requestId}`);

    let error: Error | null = null;
    
    try {
      await next();
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      const statusCode = c.res.status;

      const logContext: LogContext = {
        requestId,
        method: requestInfo.method,
        path: requestInfo.path,
        statusCode,
        duration,
        ip: requestInfo.ip,
        userAgent: requestInfo.userAgent,
      };

      // Add user context if available
      const userId = c.get('userId');
      const userEmail = c.get('userEmail');
      if (userId) logContext.userId = userId;
      if (userEmail) logContext.email = userEmail;

      // Determine status emoji and log level
      const statusEmoji = statusCode >= 500 ? '🔴' : statusCode >= 400 ? '🟡' : '🟢';
      const isSlow = duration > 1000;
      const slowIndicator = isSlow ? ' ⚡' : '';
      const userIdStr = userId ? ` | User: ${userId}` : '';
      const userEmailStr = userEmail ? ` | Email: ${userEmail}` : '';
      
      // Get response size for debugging
      const responseSize = c.res.headers.get('content-length') || 'unknown';
      const responseType = c.res.headers.get('content-type')?.split(';')[0] || 'unknown';
      
      if (error) {
        // Enhanced error logging with stack trace and context
        const errorType = error.constructor.name;
        const errorStack = error.stack?.split('\n')[1]?.trim() || 'No stack';
        const errorCode = (error as any).code || (error as any).statusCode || 'unknown';
        const errorDetails = (error as any).details ? ` | Details: ${JSON.stringify((error as any).details)}` : '';
        
        childLogger.error(`${statusEmoji} ${requestInfo.method} ${requestInfo.path} - FAILED${slowIndicator} | ${duration}ms | ${statusCode} | ${errorType}(${errorCode}): ${error.message} | Stack: ${errorStack}${errorDetails}${userIdStr}${userEmailStr} | ID: ${requestId}`);
      } else {
        // Enhanced success logging with response details
        const responseInfo = statusCode >= 200 && statusCode < 300 ? ` | Size: ${responseSize} | Type: ${responseType}` : '';
        const cacheInfo = c.res.headers.get('cache-control') ? ` | Cache: ${c.res.headers.get('cache-control')}` : '';
        const rateLimitInfo = c.res.headers.get('x-ratelimit-remaining') ? ` | RateLimit: ${c.res.headers.get('x-ratelimit-remaining')}` : '';
        
        childLogger.info(`${statusEmoji} ${requestInfo.method} ${requestInfo.path} - ${statusCode}${slowIndicator} | ${duration}ms${responseInfo}${cacheInfo}${rateLimitInfo}${userIdStr}${userEmailStr} | ID: ${requestId}`);
      }
    }
  };
};

// Debug logging helper for controllers
export const debugLog = (c: any, message: string, data?: any) => {
  const requestId = c.requestId || 'unknown';
  const userId = c.get('userId') || 'anonymous';
  const email = c.get('userEmail') || 'no-email';
  
  if (data) {
    c.logger.debug(`🔍 ${message} | Data: ${JSON.stringify(data)} | User: ${userId} | ID: ${requestId}`);
  } else {
    c.logger.debug(`🔍 ${message} | User: ${userId} | ID: ${requestId}`);
  }
};

// Authentication logging middleware
export const authLoggingMiddleware = () => {
  return async (c: Context, next: Next) => {
    await next();
    
    const userId = c.get('userId');
    const userEmail = c.get('userEmail');
    
    if (userId && c.logger) {
      // Update logger context with user info
      c.logger = c.logger.child({
        userId,
        email: userEmail,
      });
    }
  };
};

// Error logging middleware (should be placed early in the middleware chain)
export const errorLoggingMiddleware = () => {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Log the error with full context
      const logContext: LogContext = {
        requestId: c.requestId || 'unknown',
        method: c.req.method,
        path: c.req.path,
        ip: getClientIP(c),
        userAgent: getUserAgent(c),
        userId: c.get('userId'),
        email: c.get('userEmail'),
      };

      if (c.logger) {
        c.logger.error('Unhandled request error', err, logContext);
      } else {
        logger.error('Unhandled request error', err, logContext);
      }
      
      throw error; // Re-throw to allow other error handlers to process
    }
  };
};

// Security events logging middleware
export const securityLoggingMiddleware = () => {
  return async (c: Context, next: Next) => {
    await next();
    
    const statusCode = c.res.status;
    const path = c.req.path;
    const ip = getClientIP(c);
    
    // Log security-relevant events
    if (statusCode === 401) {
      logger.security('Unauthorized access attempt', {
        requestId: c.requestId,
        path,
        ip,
        userAgent: getUserAgent(c),
      });
    }
    
    if (statusCode === 403) {
      logger.security('Forbidden access attempt', {
        requestId: c.requestId,
        path,
        ip,
        userId: c.get('userId'),
        email: c.get('userEmail'),
      });
    }
    
    // Log suspicious activity patterns
    if (statusCode === 429) {
      logger.security('Rate limit exceeded', {
        requestId: c.requestId,
        path,
        ip,
        userId: c.get('userId'),
      });
    }
  };
};

// Database operation logging helper
export const logDatabaseOperation = (
  operation: string,
  table: string,
  duration?: number,
  context?: LogContext
) => {
  logger.db(`Database ${operation}`, {
    operation,
    table,
    duration,
    ...context,
  });
};

// Email operation logging helper
export const logEmailOperation = (
  operation: string,
  recipient: string,
  success: boolean,
  context?: LogContext
) => {
  const message = `Email ${operation} ${success ? 'successful' : 'failed'}`;
  logger.email(message, {
    operation,
    recipient: recipient.includes('@') ? recipient.split('@')[1] : 'unknown', // Don't log full email
    success,
    ...context,
  });
};

// Payment operation logging helper
export const logPaymentOperation = (
  operation: string,
  amount: number,
  currency: string,
  success: boolean,
  context?: LogContext
) => {
  const message = `Payment ${operation} ${success ? 'successful' : 'failed'}`;
  logger.payment(message, {
    operation,
    amount,
    currency,
    success,
    ...context,
  });
};

// Analytics operation logging helper
export const logAnalyticsEvent = (
  event: string,
  userId?: string,
  properties?: Record<string, any>,
  context?: LogContext
) => {
  logger.analytics(`Analytics event: ${event}`, {
    event,
    userId,
    properties,
    ...context,
  });
};