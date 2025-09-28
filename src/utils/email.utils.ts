import { logger } from './logger';

// DEPRECATED: For illustration only - use proper email service instead
export const sendMail = async (to: string, subject: string, text: string) => {
  logger.warn('Using deprecated sendMail function - replace with proper email service', {
    service: 'email',
    action: 'send_deprecated',
    recipient: to,
    subject,
    deprecated: true
  });
};
