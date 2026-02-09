import { Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { AuthRequest } from '../middleware/auth';
import { UserLocationModel } from '../models/UserLocation';
import { UserModel } from '../models/User';
import { ProviderModel } from '../models/Provider';
import { StorageService } from '../services/storage.service';
import { UserRole } from '../types';

export class UserController {
  /**
   * Get current user profile
   * GET /api/users/profile
   */
  static getProfile = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }

      // If provider, include provider profile
      let providerProfile = null;
      if (user.role === UserRole.PROVIDER) {
        providerProfile = await ProviderModel.findByUserId(userId);
      }

      return res.json({
        status: 'success',
        data: {
          user,
          provider: providerProfile,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * Update basic user profile
   * PATCH /api/users/profile
   */
  static updateProfile = [
    validate([
      body('username').optional().isString().withMessage('Username must be a string'),
      body('email').optional().isEmail().withMessage('Valid email is required'),
      body('phone').optional().isString().withMessage('Phone must be a string'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const { username, email, phone } = req.body;

        const updatedUser = await UserModel.updateProfile(userId, {
          username,
          email,
          phone,
        });

        return res.json({
          status: 'success',
          data: updatedUser,
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
   * Change password
   * PATCH /api/users/password
   */
  static changePassword = [
    validate([
      body('currentPassword').notEmpty().withMessage('Current password is required'),
      body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const { currentPassword, newPassword } = req.body;

        const user = await UserModel.findById(userId);
        if (!user || !user.password) {
          return res.status(400).json({
            status: 'error',
            message: 'User not found or no password set',
          });
        }

        const isCurrentPasswordValid = await UserModel.verifyPassword(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({
            status: 'error',
            message: 'Current password is incorrect',
          });
        }

        await UserModel.updatePassword(userId, newPassword);

        return res.json({
          status: 'success',
          message: 'Password updated successfully',
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
   * Update preferred contact method
   * PATCH /api/users/contact-method
   */
  static updateContactMethod = [
    validate([
      body('preferredContactMethod')
        .isIn(['phone', 'email', 'whatsapp', 'sms'])
        .withMessage('Valid contact method is required'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const { preferredContactMethod } = req.body;

        const updatedUser = await UserModel.updatePreferredContactMethod(userId, preferredContactMethod);

        return res.json({
          status: 'success',
          data: updatedUser,
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
   * Upload profile photo
   * POST /api/users/photo
   */
  static uploadPhoto = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const imageFile = req.file;

      if (!imageFile) {
        return res.status(400).json({
          status: 'error',
          message: 'No image file provided',
        });
      }

      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedMimeTypes.includes(imageFile.mimetype)) {
        return res.status(400).json({
          status: 'error',
          message: 'Only JPEG, JPG, and PNG images are allowed',
        });
      }

      const fileExt = imageFile.originalname.split('.').pop();
      const fileName = `user-${userId}-${Date.now()}.${fileExt}`;

      const uploadResult = await StorageService.uploadImage({
        path: `users/${fileName}`,
        contentType: imageFile.mimetype,
        file: imageFile.buffer,
        bucket: 'avatars',
      });

      // Update user's photo URL based on role
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }

      if (user.role === UserRole.PROVIDER) {
        await ProviderModel.updatePhoto(userId, uploadResult.url);
      } else {
        await UserModel.updateProfile(userId, { photo: uploadResult.url });
      }

      return res.json({
        status: 'success',
        data: { photoUrl: uploadResult.url },
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * Update provider-specific profile
   * PATCH /api/users/provider-profile
   */
  static updateProviderProfile = [
    validate([
      body('name').optional().isString().withMessage('Name must be a string'),
      body('bio').optional().isString().withMessage('Bio must be a string'),
      body('priceRangeMin').optional().isFloat({ min: 0 }).withMessage('Min price must be positive'),
      body('priceRangeMax').optional().isFloat({ min: 0 }).withMessage('Max price must be positive'),
      body('yearsOfExperience').optional().isInt({ min: 0 }).withMessage('Experience must be positive integer'),
      body('certifications').optional().isArray().withMessage('Certifications must be an array'),
      body('languages').optional().isArray().withMessage('Languages must be an array'),
      body('availability').optional().isObject().withMessage('Availability must be an object'),
      body('location').optional().isObject().withMessage('Location must be an object'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const user = await UserModel.findById(userId);

        if (!user || user.role !== UserRole.PROVIDER) {
          return res.status(403).json({
            status: 'error',
            message: 'Only providers can update provider profile',
          });
        }

        const {
          name,
          bio,
          priceRangeMin,
          priceRangeMax,
          yearsOfExperience,
          certifications,
          languages,
          availability,
          location,
        } = req.body;

        const updatedProvider = await ProviderModel.updateProfile(userId, {
          name,
          bio,
          priceRangeMin,
          priceRangeMax,
          yearsOfExperience,
          certifications,
          languages,
          availability,
          location,
        });

        return res.json({
          status: 'success',
          data: updatedProvider,
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
