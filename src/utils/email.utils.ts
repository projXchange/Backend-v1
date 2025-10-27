import * as brevo from '@getbrevo/brevo';
import { logger } from './logger';

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY || ''
);

interface EmailOptions {
  to: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
}

export const sendMail = async (options: EmailOptions): Promise<void> => {
  const { to, subject, htmlContent, textContent } = options;

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || 'ProjXchange',
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@projxchange.com',
    };
    
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    
    if (htmlContent) {
      sendSmtpEmail.htmlContent = htmlContent;
    }
    
    if (textContent) {
      sendSmtpEmail.textContent = textContent;
    }

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    logger.info('Email sent successfully via Brevo', {
      service: 'brevo',
      action: 'send_email',
      recipient: to,
      subject,
      messageId: response.body?.messageId || 'unknown',
    });
  } catch (error: any) {
    logger.error('Failed to send email via Brevo', error, {
      service: 'brevo',
      action: 'send_email_failed',
      recipient: to,
      subject,
      error: error.message,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Reset Your Password</h2>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #7f8c8d; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #3498db; word-break: break-all;">${resetUrl}</a>
          </p>
          <p style="color: #e74c3c; font-size: 14px; margin-top: 20px;">
            <strong>This link will expire in ${process.env.RESET_TOKEN_EXPIRY_MIN || '60'} minutes.</strong>
          </p>
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 20px;">
            If you didn't request a password reset, please ignore this email or contact support if you have concerns.
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #95a5a6; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} ProjXchange. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Reset Your Password

You requested to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in ${process.env.RESET_TOKEN_EXPIRY_MIN || '60'} minutes.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

© ${new Date().getFullYear()} ProjXchange. All rights reserved.
  `;

  await sendMail({
    to: email,
    subject: 'Reset Your Password - ProjXchange',
    htmlContent,
    textContent,
  });
};

export const sendPasswordResetConfirmationEmail = async (
  email: string,
  userName?: string
): Promise<void> => {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;
  const supportUrl = `${process.env.FRONTEND_URL}/support`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #27ae60; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto; line-height: 60px; text-align: center;">
              <span style="color: white; font-size: 30px; font-weight: bold;">✓</span>
            </div>
          </div>
          <h2 style="color: #2c3e50; margin-bottom: 20px; text-align: center;">Password Reset Successful</h2>
          <p>Hi${userName ? ` ${userName}` : ''},</p>
          <p>Your password has been successfully reset. You can now log in to your account using your new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Log In Now
            </a>
          </div>
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ Security Notice:</strong> If you didn't make this change, please contact our support team immediately.
            </p>
          </div>
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 20px;">
            For security reasons, we recommend:
          </p>
          <ul style="color: #7f8c8d; font-size: 14px;">
            <li>Using a strong, unique password</li>
            <li>Not sharing your password with anyone</li>
            <li>Enabling two-factor authentication if available</li>
          </ul>
          <p style="color: #7f8c8d; font-size: 14px;">
            Need help? <a href="${supportUrl}" style="color: #3498db;">Contact Support</a>
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #95a5a6; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} ProjXchange. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Password Reset Successful

Hi${userName ? ` ${userName}` : ''},

Your password has been successfully reset. You can now log in to your account using your new password.

Log in here: ${loginUrl}

⚠️ SECURITY NOTICE: If you didn't make this change, please contact our support team immediately.

For security reasons, we recommend:
- Using a strong, unique password
- Not sharing your password with anyone
- Enabling two-factor authentication if available

Need help? Contact Support: ${supportUrl}

© ${new Date().getFullYear()} ProjXchange. All rights reserved.
  `;

  await sendMail({
    to: email,
    subject: 'Password Reset Successful - ProjXchange',
    htmlContent,
    textContent,
  });
};
