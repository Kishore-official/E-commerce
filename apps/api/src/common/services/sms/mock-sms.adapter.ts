import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SmsServicePort, SendSmsRequest, SendSmsResponse } from './sms.port';

@Injectable()
export class MockSmsAdapter implements SmsServicePort {
  private readonly logger = new Logger(MockSmsAdapter.name);

  async sendSms(request: SendSmsRequest): Promise<SendSmsResponse> {
    this.logger.log(`[Mock] SMS → ${request.to} | Message: ${request.message.substring(0, 50)}...`);
    return { id: `mock_sms_${uuidv4()}`, success: true };
  }
}
