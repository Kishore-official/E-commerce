export interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: string[];
}

export interface SendEmailResponse {
  id: string;
  success: boolean;
  error?: string;
}

export const EMAIL_SERVICE_PORT = 'EMAIL_SERVICE_PORT';

export interface EmailServicePort {
  sendEmail(request: SendEmailRequest): Promise<SendEmailResponse>;
}
