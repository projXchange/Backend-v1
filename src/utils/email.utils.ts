// For illustration: log email to console
export const sendMail = async (to: string, subject: string, text: string) => {
  console.log(`Sending email to ${to} - ${subject}:\n${text}`);
};
