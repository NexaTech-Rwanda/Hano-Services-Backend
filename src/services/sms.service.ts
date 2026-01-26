import twilio from 'twilio';
import { config } from '../config/config';

const twilioClient =
  config.twilio.accountSid && config.twilio.authToken
    ? twilio(config.twilio.accountSid, config.twilio.authToken)
    : null;

export class SmsService {
  static async sendSMS(to: string, message: string): Promise<void> {
    if (!twilioClient) {
      console.warn(
        '[SmsService] Twilio is not configured. SMS not sent. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.'
      );
      return;
    }
    if (!config.twilio.smsFrom) {
      console.warn(
        '[SmsService] TWILIO_SMS_FROM is not set. SMS not sent.'
      );
      return;
    }

    await twilioClient.messages.create({
      to,
      from: config.twilio.smsFrom,
      body: message,
    });
  }
}

