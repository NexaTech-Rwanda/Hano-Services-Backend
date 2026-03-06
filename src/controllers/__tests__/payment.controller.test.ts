/**
 * Payment Controller Unit Tests
 * Tests HTTP layer for Flutterwave payment endpoints
 */

import { Response, Request } from 'express';
import { PaymentController } from '../../controllers/payment.controller';
import { PaymentService } from '../../services/payment.service';
import { PaymentModel } from '../../models/Payment';
import { AuthRequest } from '../../middleware/auth';
import { UserRole } from '../../types';

jest.mock('../../services/payment.service');
jest.mock('../../models/Payment');
jest.mock('../../config/config', () => ({
  config: {
    jwt: { secret: 'test-secret', expiresIn: '1h', refreshExpiresInDays: 30 },
    payments: {
      flutterwave: {
        secretHash: 'test-secret-hash',
        secretKey: 'test-secret-key',
      },
    },
    nodeEnv: 'test',
  },
}));

function createMockAuthReqRes(overrides: any = {}): {
  req: Partial<AuthRequest>;
  res: Partial<Response> & { json: jest.Mock; status: jest.Mock };
} {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const req = {
    body: {},
    params: {},
    query: {},
    headers: {},
    userId: 'customer-uuid-1',
    userRole: UserRole.CUSTOMER,
    ...overrides,
  };
  return { req: req as any, res: res as any };
}

function getHandler(controllerMethod: any[] | Function): Function {
  if (Array.isArray(controllerMethod)) {
    return controllerMethod[controllerMethod.length - 1];
  }
  return controllerMethod;
}

describe('PaymentController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Initiate Payment ────────────────────────────────────────────
  describe('initiatePayment', () => {
    it('should return 201 on successful MoMo payment initiation', async () => {
      (PaymentService.initiatePayment as jest.Mock).mockResolvedValue({
        providerReference: 'flw-ref-123',
        status: 'pending',
      });

      const { req, res } = createMockAuthReqRes({
        body: {
          bookingId: 'booking-uuid-1',
          amount: 5000,
          currency: 'RWF',
          channel: 'mtn_momo',
          phoneNumber: '+250780000001',
          email: 'test@example.com',
        },
      });

      const handler = getHandler(PaymentController.initiatePayment);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ providerReference: 'flw-ref-123' }),
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      (PaymentService.initiatePayment as jest.Mock).mockRejectedValue(
        new Error('amount is required')
      );

      const { req, res } = createMockAuthReqRes({
        body: { channel: 'mtn_momo' },
      });

      const handler = getHandler(PaymentController.initiatePayment);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for unsupported channel', async () => {
      (PaymentService.initiatePayment as jest.Mock).mockRejectedValue(
        new Error('Unsupported payment channel')
      );

      const { req, res } = createMockAuthReqRes({
        body: { amount: 5000, channel: 'bitcoin' },
      });

      const handler = getHandler(PaymentController.initiatePayment);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for MoMo without phone number', async () => {
      (PaymentService.initiatePayment as jest.Mock).mockRejectedValue(
        new Error('phoneNumber is required for mobile money payments')
      );

      const { req, res } = createMockAuthReqRes({
        body: {
          amount: 5000,
          channel: 'mtn_momo',
          email: 'test@example.com',
        },
      });

      const handler = getHandler(PaymentController.initiatePayment);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for card payment without email', async () => {
      (PaymentService.initiatePayment as jest.Mock).mockRejectedValue(
        new Error('email is required for card payments')
      );

      const { req, res } = createMockAuthReqRes({
        body: { amount: 10000, channel: 'card' },
      });

      const handler = getHandler(PaymentController.initiatePayment);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── Flutterwave Callback ────────────────────────────────────────
  describe('flutterwaveCallback', () => {
    it('should return 200 for valid webhook', async () => {
      (PaymentService.verifyWebhookSignature as jest.Mock).mockReturnValue(true);
      (PaymentModel.updateStatus as jest.Mock).mockResolvedValue(true);

      const { req, res } = createMockAuthReqRes({
        headers: { 'verif-hash': 'valid-hash' },
        body: {
          type: 'charge.completed',
          data: { reference: 'ref-1', id: 'flw-123', status: 'successful' },
        },
      });

      const handler = getHandler(PaymentController.flutterwaveCallback);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(PaymentModel.updateStatus).toHaveBeenCalledWith('ref-1', 'successful', expect.any(Object));
    });

    it('should return 401 for invalid webhook signature', async () => {
      (PaymentService.verifyWebhookSignature as jest.Mock).mockReturnValue(false);

      const { req, res } = createMockAuthReqRes({
        headers: { 'verif-hash': 'invalid-hash' },
        body: { event: 'charge.completed' },
      });

      const handler = getHandler(PaymentController.flutterwaveCallback);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── Deprecated MTN Callback ─────────────────────────────────────
  describe('mtnCallback (deprecated)', () => {
    it('should return 200 with deprecation notice', async () => {
      const { req, res } = createMockAuthReqRes({
        body: { transactionId: 'mtn-123' },
      });

      const handler = getHandler(PaymentController.mtnCallback);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('deprecated'),
        })
      );
    });
  });

  // ─── Deprecated Airtel Callback ──────────────────────────────────
  describe('airtelCallback (deprecated)', () => {
    it('should return 200 with deprecation notice', async () => {
      const { req, res } = createMockAuthReqRes({
        body: { transactionId: 'airtel-123' },
      });

      const handler = getHandler(PaymentController.airtelCallback);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('deprecated'),
        })
      );
    });
  });

  // ─── Get Payment Status ──────────────────────────────────────────
  describe('getPaymentStatus', () => {
    it('should return 200 with payment status', async () => {
      (PaymentModel.findByReference as jest.Mock).mockResolvedValue({
        reference: 'ref-1',
        status: 'successful',
        amount: 5000,
      });

      const { req, res } = createMockAuthReqRes({
        params: { reference: 'ref-1' },
      });

      const handler = getHandler(PaymentController.getPaymentStatus);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ status: 'successful' }),
        })
      );
    });

    it('should return 404 when payment not found', async () => {
      (PaymentModel.findByReference as jest.Mock).mockResolvedValue(null);

      const { req, res } = createMockAuthReqRes({
        params: { reference: 'nonexistent' },
      });

      const handler = getHandler(PaymentController.getPaymentStatus);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
