import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsServicePort, SendSmsRequest, SendSmsResponse } from './sms.port';

@Injectable()
export class Msg91SmsAdapter implements SmsServicePort {
  private readonly logger = new Logger(Msg91SmsAdapter.name);
  private readonly authKey: string;
  private readonly senderId: string;
  private readonly defaultTemplateId: string;

  constructor(private readonly configService: ConfigService) {
    this.authKey = this.configService.getOrThrow<string>('sms.msg91AuthKey');
    this.senderId = this.configService.get<string>('sms.msg91SenderId', 'MRDIAN');
    this.defaultTemplateId = this.configService.get<string>('sms.msg91TemplateId', '');
    this.logger.log('MSG91 SMS adapter initialized');
  }

  async sendSms(request: SendSmsRequest): Promise<SendSmsResponse> {
    const templateId = request.templateId || this.defaultTemplateId;

    try {
      const response = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: this.authKey,
        },
        body: JSON.stringify({
          template_id: templateId,
          sender: this.senderId,
          short_url: '0',
          mobiles: this.formatPhone(request.to),
          ...(request.variables || {}),
          // MSG91 flow API uses variable names directly in body
          // e.g., { "VAR1": "value1", "VAR2": "value2" }
        }),
      });

      const data = await response.json() as Record<string, any>;

      if (data.type === 'success') {
        this.logger.log(`SMS sent to ${request.to} | Request ID: ${data.request_id}`);
        return { id: data.request_id || '', success: true };
      }

      this.logger.error(`MSG91 error: ${JSON.stringify(data)}`);
      return { id: '', success: false, error: data.message || 'SMS sending failed' };
    } catch (error: any) {
      this.logger.error(`Failed to send SMS: ${error.message}`, error.stack);
      return { id: '', success: false, error: error.message };
    }
  }

  private formatPhone(phone: string): string {
    // MSG91 expects phone with country code, no + prefix
    // e.g., "919876543210"
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned;
    if (cleaned.length === 10) return `91${cleaned}`;
    return cleaned;
  }
}
