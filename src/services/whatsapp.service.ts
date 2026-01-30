import { config } from '../config/config';

export class WhatsappService {
  /**
   * Generate a WhatsApp deep link that opens the user's WhatsApp app
   * with a pre-filled message to the specified phone number.
   *
   * @param phoneNumber - Phone number in international format (e.g., +250788123456 or 250788123456)
   * @param message - Optional message to pre-fill (defaults to "Hello" if not provided)
   * @returns WhatsApp deep link URL
   */
  static generateDeepLink(
    phoneNumber: string,
    message?: string
  ): string {
    // Remove any non-digit characters except the leading +
    const cleanedPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Remove the + if present (wa.me format doesn't need it)
    const phoneWithoutPlus = cleanedPhone.startsWith('+')
      ? cleanedPhone.substring(1)
      : cleanedPhone;

    if (!phoneWithoutPlus || phoneWithoutPlus.length < 8) {
      throw new Error('Invalid phone number format');
    }

    // Use default message if not provided
    const defaultMessage = config.whatsapp?.defaultMessage || 'Hello';
    const messageToSend = message || defaultMessage;

    // URL encode the message
    const encodedMessage = encodeURIComponent(messageToSend);

    // Generate WhatsApp deep link
    // Format: https://wa.me/{phone}?text={message}
    return `https://wa.me/${phoneWithoutPlus}?text=${encodedMessage}`;
  }

  /**
   * Generate a WhatsApp deep link (alias for generateDeepLink for backward compatibility)
   *
   * @param phoneNumber - Phone number in international format
   * @param message - Optional message to pre-fill
   * @returns WhatsApp deep link URL
   */
  static sendMessage(phoneNumber: string, message?: string): string {
    return this.generateDeepLink(phoneNumber, message);
  }
}

