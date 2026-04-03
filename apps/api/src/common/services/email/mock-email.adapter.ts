import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EmailServicePort, SendEmailRequest, SendEmailResponse } from './email.port';

@Injectable()
export class MockEmailAdapter implements EmailServicePort {
  private readonly logger = new Logger(MockEmailAdapter.name);

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    const to = Array.isArray(request.to) ? request.to.join(', ') : request.to;
    this.logger.log(`[Mock] Email → ${to} | Subject: ${request.subject}`);
    return { id: `mock_email_${uuidv4()}`, success: true };
  }
}
