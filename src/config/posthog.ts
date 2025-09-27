import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;
let isPostHogHealthy = true;

// Suppress PostHog errors globally
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('PostHog')) {
    // Suppress PostHog errors
    return;
  }
  originalConsoleError.apply(console, args);
};

// Suppress unhandled PostHog promise rejections
process.on('unhandledRejection', (reason, promise) => {
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const message = (reason as Error).message;
    if (message.includes('PostHog') || message.includes('fetch failed')) {
      // Suppress PostHog-related unhandled rejections
      return;
    }
  }
  // Let other unhandled rejections be handled normally
  console.error('Unhandled Promise Rejection:', reason);
});

// Suppress uncaught PostHog exceptions
process.on('uncaughtException', (error) => {
  if (error.message.includes('PostHog') || error.message.includes('fetch failed')) {
    // Suppress PostHog-related uncaught exceptions
    return;
  }
  // Let other uncaught exceptions be handled normally
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export const initializePostHog = () => {
  if (!posthogClient) {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

    if (!apiKey) {
      console.warn('PostHog API key not found. Analytics will be disabled.');
      return null;
    }

    try {
      posthogClient = new PostHog(apiKey, {
        host,
        enableExceptionAutocapture: false, // Disable to prevent background errors
        // Configure for minimal network usage
        flushAt: 20, // Flush after 20 events (reduce network calls)
        flushInterval: 30000, // Flush every 30 seconds (reduce frequency)
        requestTimeout: 3000, // 3 second timeout (shorter timeout)
      });

      // Override the capture method to be completely non-blocking
      const originalCapture = posthogClient.capture.bind(posthogClient);
      posthogClient.capture = (props: any) => {
        try {
          // Use setImmediate to make it truly async and non-blocking
          setImmediate(() => {
            try {
              originalCapture(props);
            } catch (error) {
              // Silently ignore all PostHog errors
              isPostHogHealthy = false;
            }
          });
        } catch (error) {
          // Silently ignore all PostHog errors
          isPostHogHealthy = false;
        }
      };

      // Override the captureException method
      const originalCaptureException = posthogClient.captureException.bind(posthogClient);
      posthogClient.captureException = (error: Error, distinctId: string, properties?: any) => {
        try {
          setImmediate(() => {
            try {
              originalCaptureException(error, distinctId, properties);
            } catch (captureError) {
              // Silently ignore all PostHog errors
              isPostHogHealthy = false;
            }
          });
        } catch (error) {
          // Silently ignore all PostHog errors
          isPostHogHealthy = false;
        }
      };

      console.log('PostHog initialized successfully');
    } catch (error) {
      console.warn('PostHog initialization failed, analytics disabled:', error instanceof Error ? error.message : 'Unknown error');
      posthogClient = null;
      isPostHogHealthy = false;
    }
  }

  return posthogClient;
};

export const getPostHogClient = (): PostHog | null => {
  return posthogClient;
};

// Health check for PostHog connectivity
export const checkPostHogHealth = async (): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }> => {
  if (!posthogClient) {
    return { status: 'unhealthy', error: 'PostHog client not initialized' };
  }

  // Return the cached health status to avoid network calls
  if (!isPostHogHealthy) {
    return { status: 'unhealthy', error: 'PostHog has encountered errors' };
  }

  return { status: 'healthy' };
};

export const shutdownPostHog = async () => {
  if (posthogClient) {
    try {
      // Set a timeout for shutdown to prevent hanging
      const shutdownPromise = posthogClient.shutdown();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PostHog shutdown timeout')), 3000)
      );
      
      await Promise.race([shutdownPromise, timeoutPromise]);
      console.log('PostHog shutdown completed');
    } catch (error) {
      console.warn('PostHog shutdown failed (non-blocking):', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      posthogClient = null;
    }
  }
};