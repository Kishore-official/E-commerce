import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailServicePort, SendEmailRequest, SendEmailResponse } from './email.port';

@Injectable()
export class ResendEmailAdapter implements EmailServicePort {
  private readonly logger = new Logger(ResendEmailAdapter.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('email.resendApiKey');
    this.from = this.configService.get<string>('email.from', 'MERIDIAN <noreply@meridian.com>');
    this.resend = new Resend(apiKey);
    this.logger.log('Resend email adapter initialized');
  }

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    const to = Array.isArray(request.to) ? request.to : [request.to];

    try {
      const response = await this.resend.emails.send({
        from: this.from,
        to,
        subject: request.subject,
        html: request.html,
        text: request.text,
        replyTo: request.replyTo,
        tags: request.tags?.map((tag) => ({ name: tag, value: 'true' })),
      });

      if (response.error) {
        this.logger.error(`Resend error: ${response.error.message}`);
        return { id: '', success: false, error: response.error.message };
      }

      this.logger.log(`Email sent to ${to.join(', ')} | ID: ${response.data?.id}`);
      return { id: response.data?.id || '', success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return { id: '', success: false, error: error.message };
    }
  }
}
