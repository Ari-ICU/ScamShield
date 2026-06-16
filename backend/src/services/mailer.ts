import nodemailer from "nodemailer";
import logger from "../utils/logger.js";

// Create reusable transporter (e.g., SMTP or test account)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "test@example.com",
    pass: process.env.SMTP_PASS || "password",
  },
});

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  try {
    // If SMTP_USER is set to default, log instead of trying to send SMTP in production environment.
    if (!process.env.SMTP_USER || process.env.SMTP_USER === "test@example.com") {
      logger.info(`📧 [EMAIL LOG] To: ${options.to} | Subject: ${options.subject} | Text: ${options.text}`);
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"ScamShield Cambodia" <noreply@scamshield.gov.kh>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    logger.info(`📧 Email sent successfully to ${options.to}`);
  } catch (err: any) {
    logger.error(`Failed to send email to ${options.to}: ${err.message}`);
    // Do not throw to prevent server crash during tests or offline modes
  }
}
