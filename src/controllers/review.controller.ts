import { Request, Response } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validation';
import { AuthRequest } from '../middleware/auth';
import { ReviewService } from '../services/review.service';
import { UserRole } from '../types';

export class ReviewController {
  /**
   * Create review
   * POST /api/reviews
   */
  static create = [
    validate([
      body('bookingId').isUUID().withMessage('Valid bookingId is required'),
      body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
      body('comment')
        .optional()
        .isString()
        .withMessage('Comment must be a string'),
      body('proofImages')
        .optional()
        .isArray()
        .withMessage('proofImages must be an array of URLs'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const customerId = req.userId!;
        const { bookingId, rating, comment, proofImages } = req.body;

        const review = await ReviewService.createReview(bookingId, customerId, {
          rating,
          comment,
          proofImages,
        });

        return res.status(201).json({
          status: 'success',
          data: review,
        });
      } catch (error: any) {
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * List reviews for a provider
   * GET /api/reviews/provider/:providerId
   */
  static listForProvider = [
    validate([
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('limit must be between 1 and 100'),
      query('cursor')
        .optional()
        .isString()
        .withMessage('cursor must be a string'),
    ]),
    async (req: Request, res: Response) => {
      try {
        const { providerId } = req.params;
        const limit = req.query.limit
          ? parseInt(req.query.limit as string, 10)
          : undefined;
        const cursor = req.query.cursor as string | undefined;

        const { items, nextCursor } = await ReviewService.listProviderReviews(
          providerId,
          { limit, cursor }
        );

        return res.json({
          status: 'success',
          data: items,
          count: items.length,
          nextCursor,
        });
      } catch (error: any) {
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Get review by ID for current user (customer/provider)
   * GET /api/reviews/:id
   */
  static getByIdForUser = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const role = req.userRole as UserRole;

      const review = await ReviewService.getReview(req.params.id, userId, role);

      return res.json({
        status: 'success',
        data: review,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  };
}

