import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { BookingModel } from '../models/BookingModel';
import { WhatsappService } from '../services/whatsapp.service';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { UserRole, BookingStatus } from '../types';
import pool from '../config/database';

const validate = (validations: any[]) => [
  ...validations,
  (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array(),
      });
    }
    return next();
  },
];

export class BookingController {
  /**
   * Customer creates a booking request
   * POST /api/bookings
   */
  static create = [
    authenticate,
    authorize('customer' as UserRole),
    validate([
      body('providerId').isUUID().withMessage('Valid provider ID is required'),
      body('serviceCategoryId').isUUID().withMessage('Valid service category ID is required'),
      body('scheduledDate').optional().isISO8601().withMessage('Valid scheduled date is required'),
      body('description').optional().isString().withMessage('Description must be a string'),
      body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
      body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
      body('address').optional().isString().withMessage('Address must be a string'),
      body('notes').optional().isString().withMessage('Notes must be a string'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const { providerId, serviceCategoryId, scheduledDate, description, latitude, longitude, address, notes } = req.body;

        const booking = await BookingModel.create(userId, providerId, serviceCategoryId, {
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          description,
          latitude,
          longitude,
          address,
          notes,
        });

        return res.status(201).json({
          status: 'success',
          data: booking,
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
   * Customer views their own bookings
   * GET /api/bookings/my
   */
  static getMyBookings = [
    authenticate,
    authorize('customer' as UserRole),
    validate([
      query('status').optional().isIn(['pending', 'accepted', 'declined', 'completed', 'cancelled']).withMessage('Invalid status'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
      query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const { status, limit, offset } = req.query;
        const bookings = await BookingModel.findByCustomerId(userId, {
          status: status as BookingStatus | undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
          offset: offset ? parseInt(offset as string, 10) : undefined,
        });

        return res.json({
          status: 'success',
          data: bookings,
        });
      } catch (error: any) {
        return res.status(500).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Provider views their assigned bookings
   * GET /api/bookings/provider
   */
  static getProviderBookings = [
    authenticate,
    authorize('provider' as UserRole),
    validate([
      query('status').optional().isIn(['pending', 'accepted', 'declined', 'completed', 'cancelled']).withMessage('Invalid status'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
      query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const { status, limit, offset } = req.query;
        const bookings = await BookingModel.findByProviderId(userId, {
          status: status as BookingStatus | undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
          offset: offset ? parseInt(offset as string, 10) : undefined,
        });

        return res.json({
          status: 'success',
          data: bookings,
        });
      } catch (error: any) {
        return res.status(500).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Provider accepts a booking
   * PATCH /api/bookings/:id/accept
   */
  static accept = [
    authenticate,
    authorize('provider' as UserRole),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const bookingId = req.params.id;

        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
          return res.status(404).json({
            status: 'error',
            message: 'Booking not found',
          });
        }
        if (booking.providerId !== userId) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only accept bookings assigned to you',
          });
        }
        if (booking.status !== 'pending') {
          return res.status(400).json({
            status: 'error',
            message: 'Booking is not in a pending state',
          });
        }

        const updated = await BookingModel.update(bookingId, {
          status: BookingStatus.ACCEPTED,
        });

        return res.json({
          status: 'success',
          data: updated,
        });
      } catch (error: any) {
        return res.status(500).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Provider declines a booking
   * PATCH /api/bookings/:id/decline
   */
  static decline = [
    authenticate,
    authorize('provider' as UserRole),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const bookingId = req.params.id;

        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
          return res.status(404).json({
            status: 'error',
            message: 'Booking not found',
          });
        }
        if (booking.providerId !== userId) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only decline bookings assigned to you',
          });
        }
        if (booking.status !== 'pending') {
          return res.status(400).json({
            status: 'error',
            message: 'Booking is not in a pending state',
          });
        }

        const updated = await BookingModel.update(bookingId, {
          status: BookingStatus.DECLINED,
        });

        return res.json({
          status: 'success',
          data: updated,
        });
      } catch (error: any) {
        return res.status(500).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
 * Get chat messages for a booking (removed – WhatsApp only)
 * GET /api/bookings/:id/chat
 */
static getChat = [
  authenticate,
  validate([
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  ]),
  (_req: AuthRequest, res: Response) => {
    return res.status(410).json({
      status: 'error',
      message: 'Chat functionality removed. Use WhatsApp via /api/bookings/:id/whatsapp',
    });
  },
];

/**
 * Send a chat message in a booking (removed – WhatsApp only)
 * POST /api/bookings/:id/chat
 */
static sendMessage = [
  authenticate,
  validate([
    body('content').notEmpty().withMessage('Message content is required'),
  ]),
  (_req: AuthRequest, res: Response) => {
    return res.status(410).json({
      status: 'error',
      message: 'Chat functionality removed. Use WhatsApp via /api/bookings/:id/whatsapp',
    });
  },
];

  /**
   * Open WhatsApp chat for a booking (returns deep link)
   * GET /api/bookings/:id/whatsapp
   */
  static openWhatsApp = [
    authenticate,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const bookingId = req.params.id;

        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
          return res.status(404).json({
            status: 'error',
            message: 'Booking not found',
          });
        }
        if (booking.customerId !== userId && booking.providerId !== userId) {
          return res.status(403).json({
            status: 'error',
            message: 'You are not part of this booking',
          });
        }

        // Try to get the other party's WhatsApp number from user table
        const otherUserQuery = await pool.query(
          'SELECT phone FROM users WHERE id = $1',
          [booking.customerId === userId ? booking.providerId : booking.customerId]
        );

        if (otherUserQuery.rows.length === 0 || !otherUserQuery.rows[0].phone) {
          return res.status(400).json({
            status: 'error',
            message: 'Could not retrieve contact number',
          });
        }

        const whatsappLink = WhatsappService.sendMessage(
          otherUserQuery.rows[0].phone,
          `Hello! I have a question about our booking scheduled for ${booking.scheduledDate}.`
        );

        return res.json({
          status: 'success',
          data: { whatsappLink },
        });
      } catch (error: any) {
        return res.status(500).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];
}
