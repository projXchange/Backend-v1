import { Context, Next } from 'hono';
import { getPostHogClient } from '../config/posthog';
import { logger } from '../utils/logger';

// Helper to get user identifier
const getDistinctId = (c: Context) => {
  const userId = c.get('userId');
  if (userId) return userId;
  
  const ip = c.req.header('x-forwarded-for') || 
             c.req.header('x-real-ip') || 
             c.req.header('cf-connecting-ip') || 
             'anonymous';
  return `ip_${ip}`;
};

// Helper to get base properties
const getBaseProperties = (c: Context) => ({
  $current_url: c.req.url,
  $ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
  method: c.req.method,
  path: c.req.path,
  user_agent: c.req.header('user-agent'),
  timestamp: new Date().toISOString(),
});

// Helper to track event
const trackEvent = (c: Context, event: string, properties: Record<string, any> = {}) => {
  try {
    const posthog = getPostHogClient();
    if (!posthog) return;

    posthog.capture({
      distinctId: getDistinctId(c),
      event,
      properties: {
        ...getBaseProperties(c),
        ...properties,
      },
    });
  } catch (error) {
    // Silently fail - don't let PostHog errors affect the application
    logger.warn('PostHog tracking error (non-blocking)', {
      service: 'posthog',
      action: 'track_event',
      event,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// AUTH TRACKING MIDDLEWARE
export const trackUserSignup = () => {
  return async (c: Context, next: Next) => {
    await next();
    
    // Only track on successful signup (2xx response) and POST method
    if (c.req.method === 'POST' && c.res.status >= 200 && c.res.status < 300) {
      try {
        const responseBody = await c.res.clone().json();
        const requestBody = await c.req.json().catch(() => ({}));
        
        trackEvent(c, 'user_signup', {
          user_id: responseBody.user?.id,
          user_type: responseBody.user?.user_type,
          has_full_name: !!requestBody.full_name,
        });
      } catch (error) {
        logger.warn('PostHog signup tracking error', {
          service: 'posthog',
          action: 'track_signup',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
};

export const trackUserSignin = () => {
  return async (c: Context, next: Next) => {
    await next();
    
    if (c.req.method === 'POST' && c.res.status >= 200 && c.res.status < 300) {
      try {
        const responseBody = await c.res.clone().json();
        
        trackEvent(c, 'user_signin', {
          user_id: responseBody.user?.id,
          user_type: responseBody.user?.user_type,
          verification_status: responseBody.user?.verification_status,
        });
      } catch (error) {
        logger.warn('PostHog signin tracking error', {
          service: 'posthog',
          action: 'track_signin',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
};

export const trackUserLogout = () => {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    
    await next();
    
    if (c.req.method === 'POST' && c.res.status >= 200 && c.res.status < 300 && userId) {
      trackEvent(c, 'user_logout', {
        user_id: userId,
      });
    }
  };
};

export const trackPasswordReset = () => {
  return async (c: Context, next: Next) => {
    await next();
    
    if (c.req.method === 'POST' && c.res.status >= 200 && c.res.status < 300) {
      try {
        const requestBody = await c.req.json().catch(() => ({}));
        
        // For forgot password, we track the request
        if (c.req.path.includes('forgot-password')) {
          trackEvent(c, 'password_reset_requested', {
            email: requestBody.email ? 'provided' : 'not_provided', // Don't log actual email
          });
        }
        
        // For reset password completion
        if (c.req.path.includes('reset-password')) {
          const responseBody = await c.res.clone().json();
          trackEvent(c, 'password_reset_completed', {
            user_id: responseBody.user?.id,
          });
        }
      } catch (error) {
        logger.warn('PostHog password reset tracking error', {
          service: 'posthog',
          action: 'track_password_reset',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
};

// PROFILE TRACKING MIDDLEWARE
export const trackProfileCreation = () => {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    
    await next();
    
    if (c.req.method === 'POST' && c.res.status >= 200 && c.res.status < 300 && userId) {
      try {
        const requestBody = await c.req.json().catch(() => ({}));
        
        trackEvent(c, 'user_profile_created', {
          user_id: userId,
          experience_level: requestBody.experience_level || 'beginner',
          has_avatar: !!requestBody.avatar,
          has_bio: !!requestBody.bio,
          skills_count: Array.isArray(requestBody.skills) ? requestBody.skills.length : 0,
          has_social_links: !!(requestBody.social_links && Object.keys(requestBody.social_links).length > 0),
        });
      } catch (error) {
        logger.warn('PostHog profile creation tracking error', {
          service: 'posthog',
          action: 'track_profile_creation',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
};

// PROJECT TRACKING MIDDLEWARE
export const trackProjectCreation = () => {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    
    await next();
    
    if (c.req.method === 'POST' && c.res.status >= 200 && c.res.status < 300 && userId) {
      try {
        const requestBody = await c.req.json().catch(() => ({}));
        const responseBody = await c.res.clone().json();
        
        trackEvent(c, 'project_created', {
          project_id: responseBody.project?.id,
          user_id: userId,
          category: requestBody.category || 'web_development',
          difficulty_level: requestBody.difficulty_level || 'beginner',
          tech_stack_count: Array.isArray(requestBody.tech_stack) ? requestBody.tech_stack.length : 0,
          has_pricing: !!requestBody.pricing,
          has_thumbnail: !!requestBody.thumbnail,
          has_demo_url: !!requestBody.demo_url,
          has_github_url: !!requestBody.github_url,
          tags_count: Array.isArray(requestBody.tags) ? requestBody.tags.length : 0,
        });
      } catch (error) {
        logger.warn('PostHog project creation tracking error', {
          service: 'posthog',
          action: 'track_project_creation',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
};

export const trackProjectUpdate = () => {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');
    
    await next();
    
    if (c.req.method === 'PATCH' && c.res.status >= 200 && c.res.status < 300 && userId && projectId) {
      try {
        const requestBody = await c.req.json().catch(() => ({}));
        const updateFields = Object.keys(requestBody);
        
        trackEvent(c, 'project_updated', {
          project_id: projectId,
          user_id: userId,
          updated_fields: updateFields,
          fields_count: updateFields.length,
          pricing_updated: !!requestBody.pricing,
          status_updated: !!requestBody.status,
        });
      } catch (error) {
        logger.warn('PostHog project update tracking error', {
          service: 'posthog',
          action: 'track_project_update',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
};

export const trackProjectView = () => {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    const projectId = c.req.param('id');
    
    await next();
    
    if (c.res.status >= 200 && c.res.status < 300 && projectId) {
      try {
        const responseBody = await c.res.clone().json();
        const project = responseBody.project;
        
        // Only track if user is not the author
        if (project && project.author_id !== userId) {
          trackEvent(c, 'project_viewed', {
            project_id: projectId,
            user_id: userId,
            project_author_id: project.author_id,
            category: project.category,
            difficulty_level: project.difficulty_level,
            has_pricing: !!project.pricing,
          });
        }
      } catch (error) {
        logger.warn('PostHog project view tracking error', {
          service: 'posthog',
          action: 'track_project_view',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
};

// TRANSACTION TRACKING MIDDLEWARE
export const trackTransactionCreation = () => {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    
    await next();
    
    if (c.req.method === 'POST' && c.res.status >= 200 && c.res.status < 300 && userId) {
      try {
        const requestBody = await c.req.json().catch(() => ({}));
        const responseBody = await c.res.clone().json();
        
        // Calculate commission
        const amount = parseFloat(requestBody.amount) || 0;
        const commissionRate = 0.10;
        const commissionAmount = amount * commissionRate;
        const sellerAmount = amount - commissionAmount;
        
        trackEvent(c, 'transaction_created', {
          transaction_id: responseBody.transaction?.id,
          payment_transaction_id: requestBody.transaction_id,
          user_id: userId,
          project_id: requestBody.project_id,
          seller_id: requestBody.seller_id,
          amount: amount,
          currency: requestBody.currency || 'INR',
          payment_method: requestBody.payment_method || 'unknown',
          commission_amount: commissionAmount,
          seller_amount: sellerAmount,
        });
      } catch (error) {
        logger.warn('PostHog transaction creation tracking error', {
          service: 'posthog',
          action: 'track_transaction_creation',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
};

export const trackTransactionStatusUpdate = () => {
  return async (c: Context, next: Next) => {
    const transactionId = c.req.param('id');
    
    await next();
    
    if (c.req.method === 'PATCH' && c.res.status >= 200 && c.res.status < 300 && transactionId) {
      try {
        const requestBody = await c.req.json().catch(() => ({}));
        const responseBody = await c.res.clone().json();
        const transaction = responseBody.transaction;
        
        if (requestBody.status === 'completed' && transaction) {
          trackEvent(c, 'purchase_completed', {
            transaction_id: transactionId,
            user_id: transaction.user_id,
            project_id: transaction.project_id,
            seller_id: transaction.seller_id,
            amount: parseFloat(transaction.amount),
            currency: transaction.currency,
            payment_method: transaction.payment_method,
          });
        }
        
        if (requestBody.status === 'refunded' && transaction) {
          trackEvent(c, 'transaction_refunded', {
            transaction_id: transactionId,
            user_id: transaction.user_id,
            project_id: transaction.project_id,
            seller_id: transaction.seller_id,
            amount: parseFloat(transaction.amount),
            currency: transaction.currency,
          });
        }
      } catch (error) {
        logger.warn('PostHog transaction status tracking error', {
          service: 'posthog',
          action: 'track_transaction_status',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
};

// CART & WISHLIST TRACKING MIDDLEWARE
export const trackCartAction = (action: 'add' | 'remove' | 'clear') => {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    
    await next();
    
    const shouldTrack = (
      (action === 'add' && c.req.method === 'POST') ||
      (action === 'remove' && c.req.method === 'DELETE') ||
      (action === 'clear' && c.req.method === 'DELETE')
    );
    
    if (shouldTrack && c.res.status >= 200 && c.res.status < 300 && userId) {
      try {
        const requestBody = await c.req.json().catch(() => ({}));
        
        trackEvent(c, `cart_${action}`, {
          user_id: userId,
          project_id: requestBody.project_id || c.req.param('project_id'),
        });
      } catch (error) {
        logger.warn('PostHog cart action tracking error', {
          service: 'posthog',
          action: 'track_cart_action',
          cartAction: action,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
};

export const trackWishlistAction = (action: 'add' | 'remove') => {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    
    await next();
    
    const shouldTrack = (
      (action === 'add' && c.req.method === 'POST') ||
      (action === 'remove' && c.req.method === 'DELETE')
    );
    
    if (shouldTrack && c.res.status >= 200 && c.res.status < 300 && userId) {
      try {
        const requestBody = await c.req.json().catch(() => ({}));
        
        trackEvent(c, `wishlist_${action}`, {
          user_id: userId,
          project_id: requestBody.project_id || c.req.param('project_id'),
        });
      } catch (error) {
        logger.warn('PostHog wishlist action tracking error', {
          service: 'posthog',
          action: 'track_wishlist_action',
          wishlistAction: action,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
};
