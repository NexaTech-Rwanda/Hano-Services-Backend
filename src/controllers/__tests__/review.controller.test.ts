/**
 * Review Controller Unit Tests
 */

import { Response } from 'express';
import { ReviewController } from '../../controllers/review.controller';
import { ReviewService } from '../../services/review.service';
import { AuthRequest } from '../../middleware/auth';
import { UserRole } from '../../types';

jest.mock('../../services/review.service');
jest.mock('../../config/config', () => ({
  config: {
    jwt: { secret: 'test-secret', expiresIn: '1h', refreshExpiresInDays: 30 },
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

const mockReview = {
  id: 'review-uuid-1',
  bookingId: 'booking-uuid-1',
  customerId: 'customer-uuid-1',
  providerId: 'provider-uuid-1',
  rating: 5,
  comment: 'Excellent work!',
};

describe('ReviewController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Create Review ───────────────────────────────────────────────
  describe('create', () => {
    it('should return 201 on successful review creation', async () => {
      (ReviewService.createReview as jest.Mock).mockResolvedValue(mockReview);

      const { req, res } = createMockAuthReqRes({
        body: {
          bookingId: 'booking-uuid-1',
          rating: 5,
          comment: 'Excellent work!',
        },
      });

      const handler = getHandler(ReviewController.create);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ review: mockReview }),
        })
      );
    });

    it('should return 400 when booking not completed', async () => {
      (ReviewService.createReview as jest.Mock).mockRejectedValue(
        new Error('You can only review completed bookings')
      );

      const { req, res } = createMockAuthReqRes({
        body: { bookingId: 'booking-uuid-1', rating: 5 },
      });

      const handler = getHandler(ReviewController.create);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when already reviewed', async () => {
      (ReviewService.createReview as jest.Mock).mockRejectedValue(
        new Error('This booking has already been reviewed')
      );

      const { req, res } = createMockAuthReqRes({
        body: { bookingId: 'booking-uuid-1', rating: 4 },
      });

      const handler = getHandler(ReviewController.create);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── List for Provider ───────────────────────────────────────────
  describe('listForProvider', () => {
    it('should return 200 with paginated reviews', async () => {
      (ReviewService.listProviderReviews as jest.Mock).mockResolvedValue({
        items: [mockReview],
        nextCursor: null,
      });

      const { req, res } = createMockAuthReqRes({
        params: { providerId: 'provider-uuid-1' },
        query: { limit: '10' },
      });

      const handler = getHandler(ReviewController.listForProvider);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviews: expect.any(Array),
          }),
        })
      );
    });
  });

  // ─── Get By ID ───────────────────────────────────────────────────
  describe('getByIdForUser', () => {
    it('should return 200 with review for authorized user', async () => {
      (ReviewService.getReview as jest.Mock).mockResolvedValue(mockReview);

      const { req, res } = createMockAuthReqRes({
        params: { id: 'review-uuid-1' },
      });

      const handler = getHandler(ReviewController.getByIdForUser);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when review not found', async () => {
      (ReviewService.getReview as jest.Mock).mockRejectedValue(
        new Error('Review not found')
      );

      const { req, res } = createMockAuthReqRes({
        params: { id: 'nonexistent' },
      });

      const handler = getHandler(ReviewController.getByIdForUser);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when unauthorized', async () => {
      (ReviewService.getReview as jest.Mock).mockRejectedValue(
        new Error('Unauthorized to view this review')
      );

      const { req, res } = createMockAuthReqRes({
        params: { id: 'review-uuid-1' },
        userId: 'other-user',
      });

      const handler = getHandler(ReviewController.getByIdForUser);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
