import { Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { AuthRequest } from '../middleware/auth';
import { UserLocationModel } from '../models/UserLocation';
import { UserModel } from '../models/User';
import { ProviderModel } from '../models/Provider';
import { StorageService } from '../services/storage.service';
import { UserRole } from '../types';
import { logError } from '../utils/logger';

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
        logError('User not found', 'UserController.getProfile');
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

      console.log(`Fetched profile for user ID ${userId} successfully`);

      return res.json({
        status: 'success',
        data: {
          user,
          provider: providerProfile,
        },
      });
    } catch (error: any) {
      logError(error.message, 'UserController.getProfile');
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

        console.log(`Updated profile for user ID ${userId} successfully`);

        return res.json({
          status: 'success',
          data: updatedUser,
        });
      } catch (error: any) {
        logError(error.message, 'UserController.updateProfile');
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
      body('confirmPassword').notEmpty().withMessage('Password confirmation is required'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate passwords match
        if (newPassword !== confirmPassword) {
          logError('New password and confirmation do not match', 'UserController.changePassword');
          return res.status(400).json({
            status: 'error',
            message: 'New password and confirmation do not match',
          });
        }

        const user = await UserModel.findById(userId);
        if (!user || !user.password) {
          logError('User not found or no password set', 'UserController.changePassword');
          return res.status(400).json({
            status: 'error',
            message: 'User not found or no password set',
          });
        }

        const isCurrentPasswordValid = await UserModel.verifyPassword(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          logError('Current password is incorrect', 'UserController.changePassword');
          return res.status(400).json({
            status: 'error',
            message: 'Current password is incorrect',
          });
        }

        await UserModel.updatePassword(userId, newPassword);

        console.log(`Password updated successfully for user ID ${userId}`);

        return res.json({
          status: 'success',
          message: 'Password updated successfully',
        });
      } catch (error: any) {
        logError(error.message, 'UserController.changePassword');
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

        console.log(`Updated preferred contact method for user ID ${userId} to ${preferredContactMethod} successfully`);

        return res.json({
          status: 'success',
          data: updatedUser,
        });
      } catch (error: any) {
        logError(error.message, 'UserController.updateContactMethod');
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
        logError('No image file provided', 'UserController.uploadPhoto');
        return res.status(400).json({
          status: 'error',
          message: 'No image file provided',
        });
      }

      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedMimeTypes.includes(imageFile.mimetype)) {
        logError('Only JPEG, JPG, and PNG images are allowed', 'UserController.uploadPhoto');
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
        logError('User not found', 'UserController.uploadPhoto');
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

      console.log(`Profile photo uploaded successfully for user ID ${userId}`);

      return res.json({
        status: 'success',
        data: { photoUrl: uploadResult.url },
      });
    } catch (error: any) {
      logError(error.message, 'UserController.uploadPhoto');
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
          logError('Only providers can update provider profile', 'UserController.updateProviderProfile');
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

        console.log(`Updated profile for provider user ID ${userId} successfully`);

        return res.json({
          status: 'success',
          data: updatedProvider,
        });
      } catch (error: any) {
        logError(error.message, 'UserController.updateProviderProfile');
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
          logError('Unauthorized', 'UserController.trackLocation');
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

        console.log(`Location tracked for user ID ${userId} at (${latitude}, ${longitude}) successfully`);

        return res.status(201).json({
          status: 'success',
          data: location,
        });
      } catch (error: any) {
        logError(error.message, 'UserController.trackLocation');
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Update notification preferences
   * PATCH /api/users/preferences
   */
  static updatePreferences = [
    validate([
      body('emailNotifications').optional().isBoolean().withMessage('emailNotifications must be boolean'),
      body('smsNotifications').optional().isBoolean().withMessage('smsNotifications must be boolean'),
      body('pushNotifications').optional().isBoolean().withMessage('pushNotifications must be boolean'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const { emailNotifications, smsNotifications, pushNotifications } = req.body;

        const updatedUser = await UserModel.updatePreferences(userId, {
          emailNotifications,
          smsNotifications,
          pushNotifications,
        });

        console.log(`Updated preferences for user ID ${userId} successfully`);

        return res.json({
          status: 'success',
          data: updatedUser,
        });
      } catch (error: any) {
        logError(error.message, 'UserController.updatePreferences');
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];
}
