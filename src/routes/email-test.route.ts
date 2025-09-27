import { createRoute, z } from '@hono/zod-openapi';
import { OpenAPIHono } from '@hono/zod-openapi';
import { sendTestEmail, emailService } from '../utils/email.service';
import { isLoggedIn, requireManager } from '../middlewares/users.middlewares';

// Test email route
const testEmailRoute = createRoute({
  method: 'post',
  path: '/admin/test-email',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Test email sent successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            emailSent: z.boolean(),
            serviceReady: z.boolean(),
          }),
        },
      },
    },
  },
  tags: ['Admin - Email'],
});

// Email service status route
const emailStatusRoute = createRoute({
  method: 'get',
  path: '/admin/email-status',
  responses: {
    200: {
      description: 'Email service status',
      content: {
        'application/json': {
          schema: z.object({
            isReady: z.boolean(),
            config: z.object({
              host: z.string().optional(),
              port: z.number().optional(),
              hasCredentials: z.boolean(),
            }),
          }),
        },
      },
    },
  },
  tags: ['Admin - Email'],
});

const testEmailHandler = async (c: any) => {
  try {
    const { email } = await c.req.json();
    
    if (!emailService.isReady()) {
      return c.json({
        message: 'Email service is not configured or ready',
        emailSent: false,
        serviceReady: false,
      }, 503);
    }

    const emailSent = await sendTestEmail(email);
    
    return c.json({
      message: emailSent 
        ? `Test email sent successfully to ${email}` 
        : `Failed to send test email to ${email}`,
      emailSent,
      serviceReady: true,
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    return c.json({
      message: 'Error sending test email',
      emailSent: false,
      serviceReady: emailService.isReady(),
      error: error.message,
    }, 500);
  }
};

const emailStatusHandler = async (c: any) => {
  try {
    const isReady = emailService.isReady();
    
    const config = {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : undefined,
      hasCredentials: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    };

    return c.json({
      isReady,
      config,
    });
  } catch (error: any) {
    console.error('Email status error:', error);
    return c.json({
      isReady: false,
      config: {
        hasCredentials: false,
      },
      error: error.message,
    }, 500);
  }
};

export function emailTestRoutes(app: OpenAPIHono) {
  // Require admin/manager role for email testing
  app.use('/admin/test-email', isLoggedIn, requireManager);
  app.use('/admin/email-status', isLoggedIn, requireManager);
  
  app.openapi(testEmailRoute, testEmailHandler);
  app.openapi(emailStatusRoute, emailStatusHandler);
}