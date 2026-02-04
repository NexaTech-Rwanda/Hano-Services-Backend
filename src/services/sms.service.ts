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

    const baseUrl = String(config.sms.apiUrl).replace(/\/+$/, '');
    const smsUrl = (() => {
      // Support env values like:
      // - https://api.pindo.io
      // - https://api.pindo.io/v1
      // - https://api.pindo.io/v1/sms
      // - https://api.pindo.io/v1/sms/
      if (/\/v1\/sms\/?$/i.test(baseUrl)) return `${baseUrl}/`;
      if (/\/v1\/?$/i.test(baseUrl)) return `${baseUrl}/sms/`;
      return `${baseUrl}/v1/sms/`;
    })();

    try {
      await axios.post(
        smsUrl,
        {
          to,
          text: message,
          sender: config.pindo.smsFrom,
        },
        {
          headers: {
            Authorization: `Bearer ${config.sms.apiKey}`,
            Accept: '*/*',
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.error('[SmsService] Failed to send SMS:', {
        status,
        url: smsUrl,
        data: data || error.message,
      });
      throw new Error('Failed to send SMS message');
    }
  }
}

