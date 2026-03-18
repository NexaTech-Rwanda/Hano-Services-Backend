import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { BookingModel } from '../models/BookingModel';
import { BookingService } from '../services/booking.service';
import { WhatsappService } from '../services/whatsapp.service';
import { ProviderModel } from '../models/Provider';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { UserRole, BookingStatus } from '../types';
import pool from '../config/database';
import { logError } from '../utils/logger';

const validate = (validations: any[]) => [
  ...validations,
  (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logError(errors.array().join(', '), 'BookingController.validate');
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
  private static async resolveProviderIdForUser(userId: string): Promise<string> {
    const provider = await ProviderModel.findByUserId(userId);
    if (!provider) {
      throw new Error('Provider profile not found');
    }
    return provider.id;
  }

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
        const imageFile = req.file;

        const booking = await BookingService.createBooking(userId, providerId, serviceCategoryId, {
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          description,
          latitude,
          longitude,
          address,
          notes,
        }, imageFile);

        console.log("Booking created successfully:", booking); 

        return res.status(201).json({
          status: 'success',
          data: booking,
        });
      } catch (error: any) {
        logError(error.message, 'BookingController.create');
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

        console.log("Bookings fetched successfully:", bookings); 

        return res.json({
          status: 'success',
          data: bookings,
        });
      } catch (error: any) {
        logError(error.message, 'BookingController.getMyBookings');
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
        const providerId = await BookingController.resolveProviderIdForUser(userId);
        const { status, limit, offset } = req.query;
        const bookings = await BookingModel.findByProviderId(providerId, {
          status: status as BookingStatus | undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
          offset: offset ? parseInt(offset as string, 10) : undefined,
        });

        console.log("Provider bookings fetched successfully:", bookings); 

        return res.json({
          status: 'success',
          data: bookings,
        });
      } catch (error: any) {
        logError(error.message, 'BookingController.getProviderBookings');
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
        const providerId = await BookingController.resolveProviderIdForUser(userId);
        const bookingId = req.params.id;

        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
          logError('Booking not found', 'BookingController.accept');
          return res.status(404).json({
            status: 'error',
            message: 'Booking not found',
          });
        }
        if (booking.providerId !== providerId) {
          logError('You can only accept bookings assigned to you', 'BookingController.accept');
          return res.status(403).json({
            status: 'error',
            message: 'You can only accept bookings assigned to you',
          });
        }
        if (booking.status !== 'pending') {
          logError('Booking is not in a pending state', 'BookingController.accept');
          return res.status(400).json({
            status: 'error',
            message: 'Booking is not in a pending state',
          });
        }

        const updated = await BookingModel.update(bookingId, {
          status: BookingStatus.ACCEPTED,
        });

        console.log("Booking accepted successfully:", updated); 

        return res.json({
          status: 'success',
          data: updated,
        });
      } catch (error: any) {
        logError(error.message, 'BookingController.accept');
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
        const providerId = await BookingController.resolveProviderIdForUser(userId);
        const bookingId = req.params.id;

        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
          logError('Booking not found', 'BookingController.decline');
          return res.status(404).json({
            status: 'error',
            message: 'Booking not found',
          });
        }
        if (booking.providerId !== providerId) {
          logError('You can only decline bookings assigned to you', 'BookingController.decline');
          return res.status(403).json({
            status: 'error',
            message: 'You can only decline bookings assigned to you',
          });
        }
        if (booking.status !== 'pending') {
          logError('Booking is not in a pending state', 'BookingController.decline');
          return res.status(400).json({
            status: 'error',
            message: 'Booking is not in a pending state',
          });
        }

        const updated = await BookingModel.update(bookingId, {
          status: BookingStatus.DECLINED,
        });

        console.log("Booking declined successfully:", updated); 

        return res.json({
          status: 'success',
          data: updated,
        });
      } catch (error: any) {
        logError(error.message, 'BookingController.decline');
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
  /**
   * Get a booking by ID for participants
   * GET /api/bookings/:id
   */
  static getById = [
    authenticate,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const role = req.userRole!;
        const bookingId = req.params.id;

        const booking = await BookingModel.findByIdWithDetails(bookingId);
        if (!booking) {
          return res.status(404).json({
            status: 'error',
            message: 'Booking not found',
          });
        }

        if (role === UserRole.CUSTOMER) {
          if (booking.customerId !== userId) {
            return res.status(403).json({
              status: 'error',
              message: 'You are not part of this booking',
            });
          }
        } else if (role === UserRole.PROVIDER) {
          const providerId = await BookingController.resolveProviderIdForUser(userId);
          if (booking.providerId !== providerId) {
            return res.status(403).json({
              status: 'error',
              message: 'You are not part of this booking',
            });
          }
        } else {
          return res.status(403).json({
            status: 'error',
            message: 'Unauthorized role for booking access',
          });
        }

        return res.json({
          status: 'success',
          data: booking,
        });
      } catch (error: any) {
        logError(error.message, 'BookingController.getById');
        return res.status(500).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Customer cancels a booking
   * PATCH /api/bookings/:id/cancel
   */
  static cancel = [
    authenticate,
    authorize('customer' as UserRole),
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

        if (booking.customerId !== userId) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only cancel your own bookings',
          });
        }

        if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
          return res.status(400).json({
            status: 'error',
            message: 'Booking cannot be cancelled in its current state',
          });
        }

        const updated = await BookingModel.update(bookingId, {
          status: BookingStatus.CANCELLED,
        });

        return res.json({
          status: 'success',
          data: updated,
        });
      } catch (error: any) {
        logError(error.message, 'BookingController.cancel');
        return res.status(500).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Provider marks booking as completed
   * PATCH /api/bookings/:id/complete
   */
  static complete = [
    authenticate,
    authorize('provider' as UserRole),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const providerId = await BookingController.resolveProviderIdForUser(userId);
        const bookingId = req.params.id;

        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
          return res.status(404).json({
            status: 'error',
            message: 'Booking not found',
          });
        }

        if (booking.providerId !== providerId) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only complete bookings assigned to you',
          });
        }

        if (booking.status !== BookingStatus.ACCEPTED) {
          return res.status(400).json({
            status: 'error',
            message: 'Only accepted bookings can be marked as completed',
          });
        }

        const updated = await BookingModel.update(bookingId, {
          status: BookingStatus.COMPLETED,
        });

        return res.json({
          status: 'success',
          data: updated,
        });
      } catch (error: any) {
        logError(error.message, 'BookingController.complete');
        return res.status(500).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  static getChat = [
    authenticate,
    validate([
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
      query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    ]),
    (_req: AuthRequest, res: Response) => {
      logError('Chat functionality removed. Use WhatsApp via /api/bookings/:id/whatsapp', 'BookingController.getChat');
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
      logError('Chat functionality removed. Use WhatsApp via /api/bookings/:id/whatsapp', 'BookingController.sendMessage');
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
          logError('Booking not found', 'BookingController.openWhatsApp');
          return res.status(404).json({
            status: 'error',
            message: 'Booking not found',
          });
        }
        let otherPartyPhone: string | null = null;

        if (booking.customerId === userId) {
          const providerPhoneQuery = await pool.query(
            `SELECT u.phone
             FROM providers p
             JOIN users u ON p.user_id = u.id
             WHERE p.id = $1
             LIMIT 1`,
            [booking.providerId]
          );
          otherPartyPhone = providerPhoneQuery.rows[0]?.phone || null;
        } else {
          const provider = await ProviderModel.findByUserId(userId);
          if (!provider || provider.id !== booking.providerId) {
            logError('You are not part of this booking', 'BookingController.openWhatsApp');
            return res.status(403).json({
              status: 'error',
              message: 'You are not part of this booking',
            });
          }

          const customerPhoneQuery = await pool.query(
            'SELECT phone FROM users WHERE id = $1 LIMIT 1',
            [booking.customerId]
          );
          otherPartyPhone = customerPhoneQuery.rows[0]?.phone || null;
        }

        if (!otherPartyPhone) {
          logError('Could not retrieve contact number', 'BookingController.openWhatsApp');
          return res.status(400).json({
            status: 'error',
            message: 'Could not retrieve contact number',
          });
        }

        const whatsappLink = WhatsappService.sendMessage(
          otherPartyPhone,
          `Hello! I have a question about our booking scheduled for ${booking.scheduledDate}.`
        );

        console.log("WhatsApp link generated successfully:", whatsappLink); 

        return res.json({
          status: 'success',
          data: { whatsappLink },
        });
      } catch (error: any) {
        logError(error.message, 'BookingController.openWhatsApp');
        return res.status(500).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];
}
