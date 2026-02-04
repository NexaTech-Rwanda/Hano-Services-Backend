import { Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { AuthRequest } from '../middleware/auth';
import { UserLocationModel } from '../models/UserLocation';

export class UserController {
  /**
   * Track user location sample
   * POST /api/users/location
   */
  static trackLocation = [
    validate([
      body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Valid latitude is required'),
      body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Valid longitude is required'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId;
        if (!userId) {
          return res.status(401).json({
            status: 'error',
            message: 'Unauthorized',
          });
        }

        const { latitude, longitude } = req.body;
        const location = await UserLocationModel.create(
          userId,
          Number(latitude),
          Number(longitude)
        );

        return res.status(201).json({
          status: 'success',
          data: location,
        });
      } catch (error: any) {
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];
}
