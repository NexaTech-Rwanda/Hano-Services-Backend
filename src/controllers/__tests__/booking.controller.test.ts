/**
 * Booking Controller Unit Tests
 * Tests HTTP layer for booking endpoints
 */

import { Response } from 'express';
import { BookingController } from '../../controllers/booking.controller';
import { BookingService } from '../../services/booking.service';
import { AuthRequest } from '../../middleware/auth';
import { BookingStatus, UserRole } from '../../types';

jest.mock('../../services/booking.service');
jest.mock('../../services/storage.service');
jest.mock('../../config/config', () => ({
  config: {
    jwt: { secret: 'test-jwt-secret', expiresIn: '1h', refreshExpiresInDays: 30 },
    whatsapp: { defaultMessage: 'Hello' },
    nodeEnv: 'test',
  },
}));

function createMockAuthReqRes(overrides: Partial<AuthRequest> = {}): {
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
    userId: 'user-uuid-1',
    userRole: UserRole.CUSTOMER,
    ...overrides,
  };
  return { req: req as any, res: res as any };
}

function getHandler(controllerMethod: any[]): Function {
  return controllerMethod[controllerMethod.length - 1];
}

const mockBooking = {
  id: 'booking-uuid-1',
  customerId: 'user-uuid-1',
  providerId: 'provider-uuid-1',
  status: BookingStatus.PENDING,
  scheduledDate: new Date('2026-03-01'),
  description: 'Fix plumbing',
};

describe('BookingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Create Booking ──────────────────────────────────────────────
  describe('create', () => {
    it('should return 201 on successful booking creation', async () => {
      (BookingService.createBooking as jest.Mock).mockResolvedValue(mockBooking);

      const { req, res } = createMockAuthReqRes({
        body: {
          providerId: 'provider-uuid-1',
          serviceCategoryId: 'cat-uuid-1',
          scheduledDate: '2026-03-01',
          description: 'Fix plumbing',
        },
      });

      const handler = getHandler(BookingController.create);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ booking: mockBooking }),
        })
      );
    });

    it('should return 400 when provider not found', async () => {
      (BookingService.createBooking as jest.Mock).mockRejectedValue(
        new Error('Provider not found')
      );

      const { req, res } = createMockAuthReqRes({
        body: { providerId: 'nonexistent' },
      });

      const handler = getHandler(BookingController.create);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── Get My Bookings ─────────────────────────────────────────────
  describe('getMyBookings', () => {
    it('should return 200 with customer bookings', async () => {
      (BookingService.listBookingsForUser as jest.Mock).mockResolvedValue([mockBooking]);

      const { req, res } = createMockAuthReqRes();

      const handler = getHandler(BookingController.getMyBookings);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ bookings: [mockBooking] }),
        })
      );
    });
  });

  // ─── Get Provider Bookings ───────────────────────────────────────
  describe('getProviderBookings', () => {
    it('should return 200 with provider bookings', async () => {
      (BookingService.listBookingsForUser as jest.Mock).mockResolvedValue([mockBooking]);

      const { req, res } = createMockAuthReqRes({
        userRole: UserRole.PROVIDER,
      });

      const handler = getHandler(BookingController.getProviderBookings);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ─── Accept Booking ──────────────────────────────────────────────
  describe('accept', () => {
    it('should return 200 on successful acceptance', async () => {
      (BookingService.updateBookingStatusByProvider as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.ACCEPTED,
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'booking-uuid-1' },
        userRole: UserRole.PROVIDER,
      });

      const handler = getHandler(BookingController.accept);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when booking not found', async () => {
      (BookingService.updateBookingStatusByProvider as jest.Mock).mockRejectedValue(
        new Error('Booking not found')
      );

      const { req, res } = createMockAuthReqRes({
        params: { id: 'nonexistent' },
        userRole: UserRole.PROVIDER,
      });

      const handler = getHandler(BookingController.accept);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when not the assigned provider', async () => {
      (BookingService.updateBookingStatusByProvider as jest.Mock).mockRejectedValue(
        new Error('You can only update your own bookings')
      );

      const { req, res } = createMockAuthReqRes({
        params: { id: 'booking-uuid-1' },
        userRole: UserRole.PROVIDER,
        userId: 'wrong-provider',
      });

      const handler = getHandler(BookingController.accept);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 when booking is not pending', async () => {
      (BookingService.updateBookingStatusByProvider as jest.Mock).mockRejectedValue(
        new Error('Cannot change a completed or cancelled booking')
      );

      const { req, res } = createMockAuthReqRes({
        params: { id: 'booking-uuid-1' },
        userRole: UserRole.PROVIDER,
      });

      const handler = getHandler(BookingController.accept);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── Decline Booking ─────────────────────────────────────────────
  describe('decline', () => {
    it('should return 200 on successful decline', async () => {
      (BookingService.updateBookingStatusByProvider as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.DECLINED,
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'booking-uuid-1' },
        userRole: UserRole.PROVIDER,
      });

      const handler = getHandler(BookingController.decline);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ─── Deprecated Chat Endpoints ───────────────────────────────────
  describe('getChat (deprecated)', () => {
    it('should return 410 Gone', async () => {
      const { req, res } = createMockAuthReqRes({
        params: { id: 'booking-uuid-1' },
      });

      const handler = getHandler(BookingController.getChat);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(410);
    });
  });

  describe('sendMessage (deprecated)', () => {
    it('should return 410 Gone', async () => {
      const { req, res } = createMockAuthReqRes({
        params: { id: 'booking-uuid-1' },
        body: { message: 'hello' },
      });

      const handler = getHandler(BookingController.sendMessage);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(410);
    });
  });

  // ─── WhatsApp ────────────────────────────────────────────────────
  describe('openWhatsApp', () => {
    it('should return 200 with WhatsApp URL for valid booking', async () => {
      (BookingService.getBooking as jest.Mock).mockResolvedValue({
        ...mockBooking,
        provider: { phone: '+250780000002' },
        customer: { phone: '+250780000001' },
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'booking-uuid-1' },
      });

      const handler = getHandler(BookingController.openWhatsApp);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            whatsappUrl: expect.stringContaining('wa.me'),
          }),
        })
      );
    });

    it('should return 404 when booking not found', async () => {
      (BookingService.getBooking as jest.Mock).mockRejectedValue(
        new Error('Booking not found')
      );

      const { req, res } = createMockAuthReqRes({
        params: { id: 'nonexistent' },
      });

      const handler = getHandler(BookingController.openWhatsApp);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
