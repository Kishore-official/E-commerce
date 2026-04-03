export interface SendSmsRequest {
  to: string;
  message: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export interface SendSmsResponse {
  id: string;
  success: boolean;
  error?: string;
}

export const SMS_SERVICE_PORT = 'SMS_SERVICE_PORT';

export interface SmsServicePort {
  sendSms(request: SendSmsRequest): Promise<SendSmsResponse>;
}
