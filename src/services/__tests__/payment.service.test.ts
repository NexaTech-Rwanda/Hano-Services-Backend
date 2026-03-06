/**
 * Payment Service Unit Tests
 * SRS Coverage: FR20 (MoMo & Card payments via Flutterwave),
 *               FR21 (Commission on transactions)
 */

import { PaymentService, PaymentChannel } from '../../services/payment.service';
import axios from 'axios';

jest.mock('axios');
jest.mock('../../config/config', () => ({
  config: {
    payments: {
      flutterwave: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        secretKey: 'test-secret-key',
        secretHash: 'test-secret-hash',
        apiUrl: 'https://api.flutterwave.com/v4',
        authUrl: 'https://api.flutterwave.com/v4/oauth/token',
        callbackUrl: 'https://example.com/callback',
      },
    },
    nodeEnv: 'test',
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the access token cache
    (PaymentService as any).accessTokenCache = null;
  });

  // ─── FR20: Initiate Payment (routing) ────────────────────────────
  describe('initiatePayment', () => {
    it('should route MTN MoMo to mobile money handler', async () => {
      // Mock OAuth token request
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token', expires_in: 600 },
      });
      // Mock customer creation
      mockedAxios.post.mockResolvedValueOnce({
        data: { data: { id: 'flw-customer-id' } },
      });
      // Mock charge creation
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: { status: 'pending' },
        },
      });

      const result = await PaymentService.initiatePayment({
        amount: 5000,
        currency: 'RWF',
        customerId: 'customer-uuid-1',
        channel: PaymentChannel.MTN_MOMO,
        phoneNumber: '+250780000001',
        email: 'test@example.com',
      });

      expect(result).toHaveProperty('providerReference');
      expect(result.status).toBe('pending');
    });

    it('should route card payment to card handler', async () => {
      // Mock OAuth token request
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token', expires_in: 600 },
      });
      // Mock customer creation
      mockedAxios.post.mockResolvedValueOnce({
        data: { data: { id: 'flw-customer-id' } },
      });

      const result = await PaymentService.initiatePayment({
        amount: 10000,
        currency: 'RWF',
        customerId: 'customer-uuid-1',
        channel: PaymentChannel.CARD,
        email: 'test@example.com',
      });

      expect(result).toHaveProperty('providerReference');
      expect(result.status).toBe('pending');
    });

    it('should throw for unsupported channel', async () => {
      await expect(
        PaymentService.initiatePayment({
          amount: 5000,
          currency: 'RWF',
          customerId: 'customer-uuid-1',
          channel: 'bitcoin' as PaymentChannel,
          email: 'test@example.com',
        })
      ).rejects.toThrow('Unsupported payment channel');
    });
  });

  // ─── Mobile Money validations ────────────────────────────────────
  describe('mobile money payment validations', () => {
    it('should throw error when phone number is missing for MoMo', async () => {
      await expect(
        PaymentService.initiatePayment({
          amount: 5000,
          currency: 'RWF',
          customerId: 'customer-uuid-1',
          channel: PaymentChannel.MTN_MOMO,
          email: 'test@example.com',
          // phoneNumber deliberately omitted
        })
      ).rejects.toThrow('phoneNumber is required for mobile money payments');
    });

    it('should throw error when email is missing for MoMo', async () => {
      await expect(
        PaymentService.initiatePayment({
          amount: 5000,
          currency: 'RWF',
          customerId: 'customer-uuid-1',
          channel: PaymentChannel.MTN_MOMO,
          phoneNumber: '+250780000001',
          // email deliberately omitted
        })
      ).rejects.toThrow('email is required for Flutterwave payments');
    });
  });

  // ─── Card payment validations ────────────────────────────────────
  describe('card payment validations', () => {
    it('should throw error when email is missing for card payment', async () => {
      await expect(
        PaymentService.initiatePayment({
          amount: 10000,
          currency: 'RWF',
          customerId: 'customer-uuid-1',
          channel: PaymentChannel.CARD,
          // email deliberately omitted
        })
      ).rejects.toThrow('email is required for card payments');
    });
  });

  // ─── Webhook signature verification ──────────────────────────────
  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature', () => {
      const crypto = require('crypto');
      const payload = '{"event":"charge.completed"}';
      const expectedHash = crypto
        .createHmac('sha512', 'test-secret-hash')
        .update(payload)
        .digest('hex');

      const result = PaymentService.verifyWebhookSignature(payload, expectedHash);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = '{"event":"charge.completed"}';

      const result = PaymentService.verifyWebhookSignature(payload, 'invalid-signature');

      expect(result).toBe(false);
    });
  });
});
