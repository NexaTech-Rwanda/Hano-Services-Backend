import axios from 'axios';
import { config } from '../config/config';

export class SmsService {
  /**
   * Send an SMS message using Pindo API.
   *
   * @param to - Phone number in international format (e.g., +250788123456)
   * @param message - The message content to send
   */
  static async sendSMS(to: string, message: string): Promise<void> {
    if (!config.sms.apiKey) {
      console.warn(
        '[SmsService] Pindo API key is not configured. SMS not sent. Set SMS_API_KEY.'
      );
      return;
    }
    if (!config.sms.apiUrl) {
      console.warn(
        '[SmsService] Pindo API URL is not configured. SMS not sent. Set SMS_API_URL.'
      );
      return;
    }
    if (!config.pindo?.smsFrom) {
      console.warn(
        '[SmsService] PINDO_SMS_FROM is not set. SMS not sent.'
      );
      return;
    }

    try {
      await axios.post(
        `${config.sms.apiUrl}/v1/sms`,
        {
          to,
          from: config.pindo.smsFrom,
          text: message,
        },
        {
          headers: {
            Authorization: `Bearer ${config.sms.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      console.error('[SmsService] Failed to send SMS:', error.response?.data || error.message);
      throw new Error('Failed to send SMS message');
    }
  }
}

