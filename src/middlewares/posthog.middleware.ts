import { Context, Next } from 'hono';
import { getPostHogClient } from '../config/posthog';

export interface PostHogEventData {
  event: string;
  distinctId: string;
  properties?: Record<string, any>;
  groups?: Record<string, any>;
}

// Extend Hono context to include PostHog methods
declare module 'hono' {
  interface Context {
    trackEvent: (data: Omit<PostHogEventData, 'distinctId'>) => void;
    captureException: (error: Error, additionalProperties?: Record<string, any>) => void;
  }
}

export const posthogMiddleware = () => {
  return async (c: Context, next: Next) => {
    const posthog = getPostHogClient();
    
    if (!posthog) {
      // If PostHog is not initialized, provide no-op functions
      c.trackEvent = () => {};
      c.captureException = () => {};
      await next();
      return;
    }

    // Helper function to get user identifier
    const getDistinctId = () => {
      // Try to get user ID from context (set by auth middleware)
      const userId = c.get('userId');
      if (userId) return userId;
      
      // Fallback to IP address or session identifier
      const ip = c.req.header('x-forwarded-for') || 
                 c.req.header('x-real-ip') || 
                 c.req.header('cf-connecting-ip') || 
                 'anonymous';
      return `ip_${ip}`;
    };

    // Add tracking method to context
    c.trackEvent = (data: Omit<PostHogEventData, 'distinctId'>) => {
      try {
        const distinctId = getDistinctId();
        
        const baseProperties = {
          $current_url: c.req.url,
          $ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
          method: c.req.method,
          path: c.req.path,
          user_agent: c.req.header('user-agent'),
          timestamp: new Date().toISOString(),
          ...data.properties,
        };

        posthog.capture({
          distinctId,
          event: data.event,
          properties: baseProperties,
          groups: data.groups,
        });
      } catch (error) {
        // Silently fail - don't let PostHog errors affect the application
        console.warn('PostHog tracking error (non-blocking):', error instanceof Error ? error.message : 'Unknown error');
      }
    };

    // Add exception capturing method to context
    c.captureException = (error: Error, additionalProperties?: Record<string, any>) => {
      try {
        const distinctId = getDistinctId();
        
        posthog.captureException(error, distinctId, {
          $current_url: c.req.url,
          $ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
          method: c.req.method,
          path: c.req.path,
          user_agent: c.req.header('user-agent'),
          timestamp: new Date().toISOString(),
          ...additionalProperties,
        });
      } catch (captureError) {
        // Silently fail - don't let PostHog errors affect the application
        console.warn('PostHog exception capture error (non-blocking):', captureError instanceof Error ? captureError.message : 'Unknown error');
      }
    };

    try {
      await next();
    } catch (error) {
      // Capture exceptions that occur during request processing
      if (error instanceof Error) {
        c.captureException(error, {
          context: 'request_processing',
        });
      }
      
      throw error; // Re-throw the error so other error handlers can process it
    }
  };
};