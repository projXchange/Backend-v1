import nodemailer from 'nodemailer';
import { createPasswordResetEmailTemplate, createWelcomeEmailTemplate } from './email-templates';

interface EmailConfig {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      const config = this.getEmailConfig();
      if (!config) {
        console.warn('Email service not configured. Email functionality will be disabled.');
        return;
      }

      this.transporter = nodemailer.createTransport(config);

      // Verify connection
      if (this.transporter) {
        await this.transporter.verify();
      }
      console.log('✅ Email service initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
      this.transporter = null;
      this.isInitialized = false;
    }
  }

  private getEmailConfig(): EmailConfig | null {
    const {
      EMAIL_HOST,
      EMAIL_PORT,
      EMAIL_USER,
      EMAIL_PASS,
    } = process.env;

    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
      return null;
    }

    return {
      host: EMAIL_HOST,
      port: parseInt(EMAIL_PORT, 10),
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    };
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter || !this.isInitialized) {
      console.warn('Email service not available. Skipping email send.');
      return false;
    }

    try {
      const mailOptions = {
        from: `"ProjXChange" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName?: string
  ): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const { html, text } = createPasswordResetEmailTemplate({
      resetUrl,
      userName: userName || 'User',
      expiryHours: 1, // Token expires in 1 hour
    });

    return this.sendEmail({
      to: email,
      subject: 'Reset Your ProjXChange Password',
      html,
      text,
    });
  }

  async sendWelcomeEmail(
    email: string,
    userName: string,
    verificationToken?: string
  ): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = verificationToken 
      ? `${frontendUrl}/verify-email?token=${verificationToken}`
      : undefined;

    const { html, text } = createWelcomeEmailTemplate({
      userName,
      verificationUrl,
      loginUrl: `${frontendUrl}/signin`,
    });

    return this.sendEmail({
      to: email,
      subject: 'Welcome to ProjXChange! 🎉',
      html,
      text,
    });
  }

  async sendPasswordResetConfirmation(
    email: string,
    userName?: string
  ): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Successful</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Successful</h1>
            </div>
            <div class="content">
              <p>Hello ${userName || 'User'},</p>
              <p>Your password has been successfully reset. You can now log in with your new password.</p>
              <p>If you did not request this password reset, please contact our support team immediately.</p>
              <p style="text-align: center;">
                <a href="${frontendUrl}/signin" class="button">Sign In to Your Account</a>
              </p>
              <p>Best regards,<br>The ProjXChange Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Password Reset Successful

Hello ${userName || 'User'},

Your password has been successfully reset. You can now log in with your new password.

If you did not request this password reset, please contact our support team immediately.

Sign in: ${frontendUrl}/signin

Best regards,
The ProjXChange Team

This is an automated email. Please do not reply.
    `.trim();

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Successful - ProjXChange',
      html,
      text,
    });
  }

  async sendTestEmail(to: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Service Test</h2>
          <p>This is a test email from ProjXChange backend service.</p>
          <p>If you receive this email, the email service is working correctly!</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'ProjXChange Email Service Test',
      html,
      text: `Email Service Test\n\nThis is a test email from ProjXChange backend service.\nIf you receive this email, the email service is working correctly!\n\nTimestamp: ${new Date().toISOString()}`,
    });
  }

  isReady(): boolean {
    return this.isInitialized && this.transporter !== null;
  }
}

// Create and export a singleton instance
export const emailService = new EmailService();

// Export individual functions for backwards compatibility
export const sendPasswordResetEmail = (email: string, resetToken: string, userName?: string) =>
  emailService.sendPasswordResetEmail(email, resetToken, userName);

export const sendWelcomeEmail = (email: string, userName: string, verificationToken?: string) =>
  emailService.sendWelcomeEmail(email, userName, verificationToken);

export const sendPasswordResetConfirmation = (email: string, userName?: string) =>
  emailService.sendPasswordResetConfirmation(email, userName);

export const sendTestEmail = (to: string) => emailService.sendTestEmail(to);

export default emailService;