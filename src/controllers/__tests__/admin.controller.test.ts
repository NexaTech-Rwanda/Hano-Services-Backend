/**
 * Admin Controller Unit Tests
 * Tests HTTP layer for admin dashboard and management endpoints
 */

import { Response } from 'express';
import { AdminController } from '../../controllers/admin.controller';
import { AdminService } from '../../services/admin.service';
import { ReviewService } from '../../services/review.service';
import { AuthRequest } from '../../middleware/auth';
import { UserRole } from '../../types';

jest.mock('../../services/admin.service');
jest.mock('../../services/review.service');
jest.mock('../../models/VerificationRequest');
jest.mock('../../models/Provider');
jest.mock('../../config/config', () => ({
  config: {
    jwt: { secret: 'test-secret', expiresIn: '1h', refreshExpiresInDays: 30 },
    nodeEnv: 'test',
  },
}));

function createMockAdminReqRes(overrides: any = {}): {
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
    userId: 'admin-uuid-1',
    userRole: UserRole.ADMIN,
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

describe('AdminController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Dashboard Summary ──────────────────────────────────────────
  describe('getDashboardSummary', () => {
    it('should return 200 with dashboard stats', async () => {
      const summary = {
        totalUsers: 150,
        totalProviders: 45,
        totalBookings: 320,
        completedBookings: 200,
        pendingBookings: 50,
        totalRevenue: 1500000,
      };
      (AdminService.getDashboardSummary as jest.Mock).mockResolvedValue(summary);

      const { req, res } = createMockAdminReqRes();

      const handler = getHandler(AdminController.getDashboardSummary);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ totalUsers: 150 }),
        })
      );
    });

    it('should return 500 on internal error', async () => {
      (AdminService.getDashboardSummary as jest.Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      const { req, res } = createMockAdminReqRes();

      const handler = getHandler(AdminController.getDashboardSummary);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── List Users ──────────────────────────────────────────────────
  describe('listUsers', () => {
    it('should return 200 with paginated users', async () => {
      const users = [{ id: 'u1', username: 'user1' }];
      (AdminService.listUsers as jest.Mock).mockResolvedValue(users);

      const { req, res } = createMockAdminReqRes({
        query: { limit: '10' },
      });

      const handler = getHandler(AdminController.listUsers);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should apply role filter', async () => {
      (AdminService.listUsers as jest.Mock).mockResolvedValue([]);

      const { req, res } = createMockAdminReqRes({
        query: { limit: '10', role: 'customer' },
      });

      const handler = getHandler(AdminController.listUsers);
      await handler(req, res);

      expect(AdminService.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'customer' })
      );
    });
  });

  // ─── List Providers ──────────────────────────────────────────────
  describe('listProviders', () => {
    it('should return 200 with paginated providers', async () => {
      (AdminService.listProviders as jest.Mock).mockResolvedValue([]);

      const { req, res } = createMockAdminReqRes({
        query: { limit: '10' },
      });

      const handler = getHandler(AdminController.listProviders);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ─── List Bookings ──────────────────────────────────────────────
  describe('listBookings', () => {
    it('should return 200 with paginated bookings', async () => {
      (AdminService.listBookings as jest.Mock).mockResolvedValue([]);

      const { req, res } = createMockAdminReqRes({
        query: { limit: '10' },
      });

      const handler = getHandler(AdminController.listBookings);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should filter by status', async () => {
      (AdminService.listBookings as jest.Mock).mockResolvedValue([]);

      const { req, res } = createMockAdminReqRes({
        query: { limit: '10', status: 'completed' },
      });

      const handler = getHandler(AdminController.listBookings);
      await handler(req, res);

      expect(AdminService.listBookings).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );
    });
  });

  // ─── Verification Requests ──────────────────────────────────────
  describe('getVerificationRequests', () => {
    it('should return 200 with verification requests', async () => {
      const { VerificationRequestModel } = require('../../models/VerificationRequest');
      VerificationRequestModel.findAll = jest.fn().mockResolvedValue([]);

      const { req, res } = createMockAdminReqRes({
        query: { limit: '10' },
      });

      const handler = getHandler(AdminController.getVerificationRequests);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getVerificationRequest', () => {
    it('should return 200 for existing request', async () => {
      const { VerificationRequestModel } = require('../../models/VerificationRequest');
      VerificationRequestModel.findById = jest.fn().mockResolvedValue({
        id: 'vr-uuid-1',
        status: 'pending',
      });

      const { req, res } = createMockAdminReqRes({
        params: { id: 'vr-uuid-1' },
      });

      const handler = getHandler(AdminController.getVerificationRequest);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when not found', async () => {
      const { VerificationRequestModel } = require('../../models/VerificationRequest');
      VerificationRequestModel.findById = jest.fn().mockResolvedValue(null);

      const { req, res } = createMockAdminReqRes({
        params: { id: 'nonexistent' },
      });

      const handler = getHandler(AdminController.getVerificationRequest);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('reviewVerificationRequest', () => {
    it('should return 200 on approval', async () => {
      const { VerificationRequestModel } = require('../../models/VerificationRequest');
      const { ProviderModel } = require('../../models/Provider');
      VerificationRequestModel.findById = jest.fn().mockResolvedValue({
        id: 'vr-uuid-1',
        providerId: 'provider-uuid-1',
        status: 'pending',
      });
      VerificationRequestModel.updateStatus = jest.fn().mockResolvedValue(undefined);
      ProviderModel.updateVerificationStatus = jest.fn().mockResolvedValue(undefined);

      const { req, res } = createMockAdminReqRes({
        params: { id: 'vr-uuid-1' },
        body: { status: 'approved', adminNotes: 'Looks good' },
      });

      const handler = getHandler(AdminController.reviewVerificationRequest);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 200 on rejection', async () => {
      const { VerificationRequestModel } = require('../../models/VerificationRequest');
      const { ProviderModel } = require('../../models/Provider');
      VerificationRequestModel.findById = jest.fn().mockResolvedValue({
        id: 'vr-uuid-1',
        providerId: 'provider-uuid-1',
        status: 'pending',
      });
      VerificationRequestModel.updateStatus = jest.fn().mockResolvedValue(undefined);
      ProviderModel.updateVerificationStatus = jest.fn().mockResolvedValue(undefined);

      const { req, res } = createMockAdminReqRes({
        params: { id: 'vr-uuid-1' },
        body: { status: 'rejected', adminNotes: 'Invalid documents' },
      });

      const handler = getHandler(AdminController.reviewVerificationRequest);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for already reviewed request', async () => {
      const { VerificationRequestModel } = require('../../models/VerificationRequest');
      VerificationRequestModel.findById = jest.fn().mockResolvedValue({
        id: 'vr-uuid-1',
        status: 'approved',
      });

      const { req, res } = createMockAdminReqRes({
        params: { id: 'vr-uuid-1' },
        body: { status: 'rejected' },
      });

      const handler = getHandler(AdminController.reviewVerificationRequest);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── Delete Review ───────────────────────────────────────────────
  describe('deleteReview', () => {
    it('should return 200 on successful deletion', async () => {
      (ReviewService.deleteReviewByAdmin as jest.Mock).mockResolvedValue(undefined);

      const { req, res } = createMockAdminReqRes({
        params: { id: 'review-uuid-1' },
      });

      const handler = getHandler(AdminController.deleteReview);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when review not found', async () => {
      (ReviewService.deleteReviewByAdmin as jest.Mock).mockRejectedValue(
        new Error('Review not found')
      );

      const { req, res } = createMockAdminReqRes({
        params: { id: 'nonexistent' },
      });

      const handler = getHandler(AdminController.deleteReview);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
