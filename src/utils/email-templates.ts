interface PasswordResetTemplateParams {
  resetUrl: string;
  userName: string;
  expiryHours: number;
}

interface WelcomeTemplateParams {
  userName: string;
  verificationUrl?: string;
  loginUrl: string;
}

interface EmailTemplate {
  html: string;
  text: string;
}

export function createPasswordResetEmailTemplate(params: PasswordResetTemplateParams): EmailTemplate {
  const { resetUrl, userName, expiryHours } = params;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - ProjXChange</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
            margin-bottom: 20px;
          }
          .header {
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .content h2 {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .content p {
            margin-bottom: 20px;
            color: #4b5563;
            font-size: 16px;
          }
          .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
            transition: all 0.3s ease;
          }
          .reset-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
          }
          .security-notice {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            border-radius: 6px;
            margin: 30px 0;
          }
          .security-notice h3 {
            color: #92400e;
            margin: 0 0 10px 0;
            font-size: 18px;
          }
          .security-notice p {
            color: #92400e;
            margin: 0;
          }
          .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            color: #6b7280;
            font-size: 14px;
            margin: 5px 0;
          }
          .link-fallback {
            word-break: break-all;
            background-color: #f3f4f6;
            padding: 12px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 14px;
            margin: 10px 0;
          }
          @media (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 8px;
            }
            .header, .content {
              padding: 30px 20px;
            }
            .header h1 {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${userName}!</h2>
            
            <p>We received a request to reset your password for your ProjXChange account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="reset-button">Reset My Password</a>
            </div>
            
            <p>This link will expire in <strong>${expiryHours} hour${expiryHours > 1 ? 's' : ''}</strong> for security reasons.</p>
            
            <div class="security-notice">
              <h3>🛡️ Security Notice</h3>
              <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged, and no further action is required.</p>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <div class="link-fallback">${resetUrl}</div>
            
            <p>Best regards,<br>The ProjXChange Team</p>
          </div>
          
          <div class="footer">
            <p>ProjXChange - Your Project Exchange Platform</p>
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>If you need help, contact our support team.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Reset Your Password - ProjXChange

Hello ${userName}!

We received a request to reset your password for your ProjXChange account.

To reset your password, please visit this link:
${resetUrl}

This link will expire in ${expiryHours} hour${expiryHours > 1 ? 's' : ''} for security reasons.

SECURITY NOTICE:
If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged, and no further action is required.

Best regards,
The ProjXChange Team

---
ProjXChange - Your Project Exchange Platform
This is an automated email. Please do not reply to this message.
If you need help, contact our support team.
  `.trim();

  return { html, text };
}

export function createWelcomeEmailTemplate(params: WelcomeTemplateParams): EmailTemplate {
  const { userName, verificationUrl, loginUrl } = params;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ProjXChange!</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
            margin-bottom: 20px;
          }
          .header {
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .content h2 {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .content p {
            margin-bottom: 20px;
            color: #4b5563;
            font-size: 16px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
          }
          .features {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 8px;
            margin: 30px 0;
          }
          .features h3 {
            color: #1f2937;
            margin-bottom: 20px;
            font-size: 20px;
          }
          .features ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .features li {
            padding: 8px 0;
            color: #4b5563;
          }
          .features li:before {
            content: "✅ ";
            margin-right: 8px;
          }
          .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            color: #6b7280;
            font-size: 14px;
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to ProjXChange!</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${userName}!</h2>
            
            <p>Welcome to ProjXChange - the ultimate platform for buying and selling amazing projects! We're thrilled to have you join our community of creators and innovators.</p>
            
            ${verificationUrl ? `
            <p>To get started, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" class="cta-button">Verify Email Address</a>
            </div>
            ` : `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" class="cta-button">Start Exploring Projects</a>
            </div>
            `}
            
            <div class="features">
              <h3>What you can do on ProjXChange:</h3>
              <ul>
                <li>Browse thousands of amazing projects across different categories</li>
                <li>Purchase high-quality projects with source code and documentation</li>
                <li>Sell your own projects and earn money from your creations</li>
                <li>Connect with other developers and creators in our community</li>
                <li>Access detailed project documentation and support</li>
              </ul>
            </div>
            
            <p>If you have any questions or need assistance, our support team is here to help. Don't hesitate to reach out!</p>
            
            <p>Happy coding!<br>The ProjXChange Team</p>
          </div>
          
          <div class="footer">
            <p>ProjXChange - Your Project Exchange Platform</p>
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>Need help? Contact our support team anytime.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Welcome to ProjXChange!

Hello ${userName}!

Welcome to ProjXChange - the ultimate platform for buying and selling amazing projects! We're thrilled to have you join our community of creators and innovators.

${verificationUrl ? `To get started, please verify your email address: ${verificationUrl}` : `Start exploring: ${loginUrl}`}

What you can do on ProjXChange:
✅ Browse thousands of amazing projects across different categories
✅ Purchase high-quality projects with source code and documentation
✅ Sell your own projects and earn money from your creations
✅ Connect with other developers and creators in our community
✅ Access detailed project documentation and support

If you have any questions or need assistance, our support team is here to help. Don't hesitate to reach out!

Happy coding!
The ProjXChange Team

---
ProjXChange - Your Project Exchange Platform
This is an automated email. Please do not reply to this message.
Need help? Contact our support team anytime.
  `.trim();

  return { html, text };
}