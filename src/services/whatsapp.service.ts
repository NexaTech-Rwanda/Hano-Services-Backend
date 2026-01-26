import twilio from 'twilio';
import { config } from '../config/config';

const twilioClient =
  config.twilio.accountSid && config.twilio.authToken
    ? twilio(config.twilio.accountSid, config.twilio.authToken)
    : null;

export class WhatsappService {
  /**
   * Send a WhatsApp message using Twilio's WhatsApp API.
   *
   * Note: `to` must be in the form `whatsapp:+2507xxxxxxx`
   * and `TWILIO_WHATSAPP_FROM` must be a WhatsApp-enabled number
   * (also in `whatsapp:+...` format).
   */
  static async sendMessage(to: string, message: string): Promise<void> {
    if (!twilioClient) {
      console.warn(
        '[WhatsappService] Twilio is not configured. WhatsApp message not sent. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.'
      );
      return;
    }
    if (!config.twilio.whatsappFrom) {
      console.warn(
        '[WhatsappService] TWILIO_WHATSAPP_FROM is not set. WhatsApp message not sent.'
      );
      return;
    }

    await twilioClient.messages.create({
      to,
      from: config.twilio.whatsappFrom,
      body: message,
    });
  }
}

