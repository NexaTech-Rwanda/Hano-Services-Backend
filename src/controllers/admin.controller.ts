import { Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { AuthRequest } from '../middleware/auth';
import { VerificationRequestModel } from '../models/VerificationRequest';
import { ProviderModel } from '../models/Provider';
import { ReviewModel } from '../models/Review';
import { VerificationStatus, UserRole, BookingStatus } from '../types';
import { AdminService } from '../services/admin.service';
import { logError } from '../utils/logger';

export class AdminController {
  /**
   * Dashboard summary
   * GET /api/admin/dashboard/summary
   */
  static getDashboardSummary = async (_req: Request, res: Response) => {
    try {
      const summary = await AdminService.getDashboardSummary();
      return res.json({
        status: 'success',
        data: summary,
      });
    } catch (error: any) {
      logError(error.message, 'AdminController.getDashboardSummary');
      return res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * List users with filters
   * GET /api/admin/users
   */
  static listUsers = async (req: Request, res: Response) => {
    try {
      const role = req.query.role as UserRole | undefined;
      const search = req.query.search as string | undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : undefined;
      const cursor = req.query.cursor as string | undefined;

      const { items, nextCursor } = await AdminService.listUsers({
        role,
        search,
        limit,
        offset,
        cursor,
      });

      return res.json({
        status: 'success',
        data: items,
        count: items.length,
        nextCursor,
      });
    } catch (error: any) {
      logError(error.message, 'AdminController.listUsers');
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * List providers with filters
   * GET /api/admin/providers
   */
  static listProviders = async (req: Request, res: Response) => {
    try {
      const isVerifiedParam = req.query.isVerified as string | undefined;
      const isVerified =
        typeof isVerifiedParam === 'string'
          ? isVerifiedParam === 'true'
          : undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : undefined;
      const cursor = req.query.cursor as string | undefined;

      const { items, nextCursor } = await AdminService.listProviders({
        isVerified,
        categoryId,
        limit,
        offset,
        cursor,
      });

      return res.json({
        status: 'success',
        data: items,
        count: items.length,
        nextCursor,
      });
    } catch (error: any) {
      logError(error.message, 'AdminController.listProviders');
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * List bookings with filters
   * GET /api/admin/bookings
   */
  static listBookings = async (req: Request, res: Response) => {
    try {
      const status = req.query.status as BookingStatus | undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : undefined;
      const cursor = req.query.cursor as string | undefined;

      const { items, nextCursor } = await AdminService.listBookings({
        status,
        limit,
        offset,
        cursor,
      });

      return res.json({
        status: 'success',
        data: items,
        count: items.length,
        nextCursor,
      });
    } catch (error: any) {
      logError(error.message, 'AdminController.listBookings');
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * Get all verification requests (optionally filtered by status)
   * GET /api/admin/verification-requests
   */
  static getVerificationRequests = async (req: Request, res: Response) => {
    try {
      const status = req.query.status as VerificationStatus | undefined;
      
      let requests;
      if (status) {
        requests = await VerificationRequestModel.findByStatus(status);
      } else {
        requests = await VerificationRequestModel.findAll();
      }

      return res.json({
        status: 'success',
        data: requests,
        count: requests.length,
      });
    } catch (error: any) {
      logError(error.message, 'AdminController.getVerificationRequests');
      return res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * Get verification request by ID
   * GET /api/admin/verification-requests/:id
   */
  static getVerificationRequest = async (req: Request, res: Response) => {
    try {
      const request = await VerificationRequestModel.findById(req.params.id);
      if (!request) {
        logError('Verification request not found', 'AdminController.getVerificationRequest');
        return res.status(404).json({
          status: 'error',
          message: 'Verification request not found',
        });
      }

      return res.json({
        status: 'success',
        data: request,
      });
    } catch (error: any) {
      logError(error.message, 'AdminController.getVerificationRequest');
      return res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * Approve or reject verification request
   * PATCH /api/admin/verification-requests/:id
   */
  static reviewVerificationRequest = [
    validate([
      body('status')
        .isIn(['approved', 'rejected'])
        .withMessage('Status must be either approved or rejected'),
      body('adminNotes')
        .optional()
        .isString()
        .withMessage('Admin notes must be a string'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const adminId = req.userId!;
        const requestId = req.params.id;
        const { status, adminNotes } = req.body;

        // Get the verification request
        const request = await VerificationRequestModel.findById(requestId);
        if (!request) {
          logError('Verification request not found', 'AdminController.reviewVerificationRequest');
          return res.status(404).json({
            status: 'error',
            message: 'Verification request not found',
          });
        }

        if (request.status !== 'pending') {
          logError('This verification request has already been reviewed', 'AdminController.reviewVerificationRequest');
          return res.status(400).json({
            status: 'error',
            message: 'This verification request has already been reviewed',
          });
        }

        // Update verification request status
        const updatedRequest = await VerificationRequestModel.updateStatus(
          requestId,
          status as VerificationStatus,
          adminId,
          adminNotes
        );

        // Update provider verification status
        const isVerified = status === 'approved';
        await ProviderModel.updateVerificationStatus(
          request.providerId,
          status as VerificationStatus,
          isVerified
        );

        return res.json({
          status: 'success',
          data: updatedRequest,
          message: `Verification request ${status} successfully`,
        });
      } catch (error: any) {
        logError(error.message, 'AdminController.reviewVerificationRequest');
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Delete a review (admin)
   * DELETE /api/admin/reviews/:id
   */
  static deleteReview = async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await ReviewModel.delete(req.params.id);
      if (!deleted) {
        logError('Review not found', 'AdminController.deleteReview');
        return res.status(404).json({
          status: 'error',
          message: 'Review not found',
        });
      }

      return res.json({
        status: 'success',
        message: 'Review deleted successfully',
      });
    } catch (error: any) {
      logError(error.message, 'AdminController.deleteReview');
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  };
}
