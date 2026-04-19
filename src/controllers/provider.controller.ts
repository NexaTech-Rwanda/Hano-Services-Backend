import { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validation';
import { AuthRequest } from '../middleware/auth';
import { ProviderService } from '../services/provider.service';
import { ProviderAvailability } from '../types';
import { StorageService } from '../services/storage.service';
import { ProviderModel } from '../models/Provider';
import { logError } from '../utils/logger';

export class ProviderController {
  private static getFileExtension(file: Express.Multer.File): string {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext && ext.length <= 10) return ext;

    const mime = (file.mimetype || '').toLowerCase();
    if (mime === 'image/jpeg') return '.jpg';
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    return '';
  }

  /**
   * Create provider profile
   * POST /api/providers
   */
  static create = [
    validate([
      body('name').notEmpty().withMessage('Name is required'),
      body('serviceCategoryId')
        .isUUID()
        .withMessage('Valid service category ID is required'),
      body('photo').optional().isURL().withMessage('Valid photo URL is required'),
      body('priceRangeMin')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price range min must be a positive number'),
      body('priceRangeMax')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price range max must be a positive number'),
      body('yearsOfExperience')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Years of experience must be a non-negative integer'),
      body('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Valid latitude is required'),
      body('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Valid longitude is required'),
      body('bio').optional().isString().withMessage('Bio must be a string'),
      body('certifications').optional().isArray().withMessage('Certifications must be an array'),
      body('languages').optional().isArray().withMessage('Languages must be an array'),
      body('availabilityHours').optional().isObject().withMessage('Availability hours must be an object'),
      body('responseRate')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Response rate must be between 0 and 100'),
      body('responseTimeMinutes')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Response time minutes must be a non-negative integer'),
      body('website').optional().isURL().withMessage('Website must be a valid URL'),
      body('socialLinks').optional().isObject().withMessage('Social links must be an object'),
      body('preferredContactMethod')
        .optional()
        .isIn(['phone', 'email', 'whatsapp', 'sms'])
        .withMessage('Preferred contact method is invalid'),
      body('isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean'),
      body('featuredUntil').optional().isISO8601().withMessage('featuredUntil must be a valid date'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const uploadedPhoto = (req as any).file as Express.Multer.File | undefined;
        const {
          name,
          serviceCategoryId,
          photo,
          priceRangeMin,
          priceRangeMax,
          yearsOfExperience,
          latitude,
          longitude,
          address,
          bio,
          certifications,
          languages,
          availabilityHours,
          responseRate,
          responseTimeMinutes,
          website,
          socialLinks,
          preferredContactMethod,
          isFeatured,
          featuredUntil,
        } = req.body;

        const provider = await ProviderService.createProfile(
          userId,
          name,
          serviceCategoryId,
          {
            photo: uploadedPhoto ? undefined : photo,
            priceRangeMin,
            priceRangeMax,
            yearsOfExperience,
            latitude,
            longitude,
            address,
            bio,
            certifications,
            languages,
            availabilityHours,
            responseRate,
            responseTimeMinutes,
            website,
            socialLinks,
            preferredContactMethod,
            isFeatured,
            featuredUntil: featuredUntil ? new Date(featuredUntil) : undefined,
          }
        );

        let finalProvider = provider;
        if (uploadedPhoto) {
          if (!uploadedPhoto.mimetype?.toLowerCase().startsWith('image/')) {
            logError('Uploaded photo must be an image', 'ProviderController.createProfile');
            return res.status(400).json({
              status: 'error',
              message: 'Uploaded photo must be an image',
            });
          }

          const ext = this.getFileExtension(uploadedPhoto);
          const namePart = crypto.randomBytes(8).toString('hex');
          const filePath = `providers/${provider.id}/photo-${Date.now()}-${namePart}${ext}`;
          const { url } = await StorageService.uploadImage({
            path: filePath,
            contentType: uploadedPhoto.mimetype,
            file: uploadedPhoto.buffer,
          });

          finalProvider =
            (await ProviderService.updateProfile(provider.id, userId, { photo: url })) ||
            provider;
        }

        console.log("Provider profile created successfully:", finalProvider); 

        return res.status(201).json({
          status: 'success',
          data: finalProvider,
        });
      } catch (error: any) {
        logError(error.message, 'ProviderController.createProfile');
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Get provider profile by ID
   * GET /api/providers/:id
   */
  static getById = async (req: Request, res: Response) => {
    try {
      const provider = await ProviderService.getProfile(req.params.id);
      res.json({
        status: 'success',
        data: provider,
      });
    } catch (error: any) {
      logError(error.message, 'ProviderController.getById');
      res.status(404).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * Get current user's provider profile
   * GET /api/providers/me
   */
  static getMyProfile = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      // Try to find the provider profile; if it doesn't exist yet, return null gracefully
      const providerRow = await ProviderModel.findByUserId(userId);
      if (!providerRow) {
        return res.json({
          status: 'success',
          data: null,
          message: 'No provider profile created yet',
        });
      }

      // Get enriched profile with details (rating, reviews, portfolio count)
      const provider = await ProviderModel.findByIdWithDetails(providerRow.id);
      res.json({
        status: 'success',
        data: provider,
      });
    } catch (error: any) {
      logError(error.message, 'ProviderController.getMyProfile');
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * Update provider profile
   * PUT /api/providers/:id
   */
  static update = [
    validate([
      body('name').optional().notEmpty().withMessage('Name cannot be empty'),
      body('photo').optional().isURL().withMessage('Valid photo URL is required'),
      body('serviceCategoryId')
        .optional()
        .isUUID()
        .withMessage('Valid service category ID is required'),
      body('priceRangeMin')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price range min must be a positive number'),
      body('priceRangeMax')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price range max must be a positive number'),
      body('yearsOfExperience')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Years of experience must be a non-negative integer'),
      body('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Valid latitude is required'),
      body('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Valid longitude is required'),
      body('bio').optional().isString().withMessage('Bio must be a string'),
      body('certifications').optional().isArray().withMessage('Certifications must be an array'),
      body('languages').optional().isArray().withMessage('Languages must be an array'),
      body('availabilityHours').optional().isObject().withMessage('Availability hours must be an object'),
      body('responseRate')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Response rate must be between 0 and 100'),
      body('responseTimeMinutes')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Response time minutes must be a non-negative integer'),
      body('website').optional().isURL().withMessage('Website must be a valid URL'),
      body('socialLinks').optional().isObject().withMessage('Social links must be an object'),
      body('preferredContactMethod')
        .optional()
        .isIn(['phone', 'email', 'whatsapp', 'sms'])
        .withMessage('Preferred contact method is invalid'),
      body('isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean'),
      body('featuredUntil').optional().isISO8601().withMessage('featuredUntil must be a valid date'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const providerId = req.params.id;
        const uploadedPhoto = (req as any).file as Express.Multer.File | undefined;
        const {
          name,
          photo,
          serviceCategoryId,
          priceRangeMin,
          priceRangeMax,
          yearsOfExperience,
          latitude,
          longitude,
          address,
          bio,
          certifications,
          languages,
          availabilityHours,
          responseRate,
          responseTimeMinutes,
          website,
          socialLinks,
          preferredContactMethod,
          isFeatured,
          featuredUntil,
        } = req.body;

        if (uploadedPhoto) {
          await ProviderService.updateProfile(providerId, userId, {});
          if (!uploadedPhoto.mimetype?.toLowerCase().startsWith('image/')) {
            logError('Uploaded photo must be an image', 'ProviderController.updateProfile');
            return res.status(400).json({
              status: 'error',
              message: 'Uploaded photo must be an image',
            });
          }

          const ext = this.getFileExtension(uploadedPhoto);
          const namePart = crypto.randomBytes(8).toString('hex');
          const filePath = `providers/${providerId}/photo-${Date.now()}-${namePart}${ext}`;
          const { url } = await StorageService.uploadImage({
            path: filePath,
            contentType: uploadedPhoto.mimetype,
            file: uploadedPhoto.buffer,
          });

          const provider = await ProviderService.updateProfile(providerId, userId, {
            name,
            photo: url,
            serviceCategoryId,
            priceRangeMin,
            priceRangeMax,
            yearsOfExperience,
            latitude,
            longitude,
            address,
            bio,
            certifications,
            languages,
            availabilityHours,
            responseRate,
            responseTimeMinutes,
            website,
            socialLinks,
            preferredContactMethod,
            isFeatured,
            featuredUntil: featuredUntil ? new Date(featuredUntil) : undefined,
          });

          return res.json({
            status: 'success',
            data: provider,
          });
        }

        const provider = await ProviderService.updateProfile(providerId, userId, {
          name,
          photo,
          serviceCategoryId,
          priceRangeMin,
          priceRangeMax,
          yearsOfExperience,
          latitude,
          longitude,
          address,
          bio,
          certifications,
          languages,
          availabilityHours,
          responseRate,
          responseTimeMinutes,
          website,
          socialLinks,
          preferredContactMethod,
          isFeatured,
          featuredUntil: featuredUntil ? new Date(featuredUntil) : undefined,
        });

        console.log("Provider profile updated successfully:", provider); 

        return res.json({
          status: 'success',
          data: provider,
        });
      } catch (error: any) {
        logError(error.message, 'ProviderController.updateProfile');
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Update availability
   * PATCH /api/providers/:id/availability
   */
  static updateAvailability = [
    validate([
      body('availability')
        .isIn(['available', 'busy', 'offline'])
        .withMessage('Valid availability status is required'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const providerId = req.params.id;
        const { availability } = req.body;

        const provider = await ProviderService.updateAvailability(
          providerId,
          userId,
          availability as ProviderAvailability
        );

        res.json({
          status: 'success',
          data: provider,
        });
      } catch (error: any) {
        logError(error.message, 'ProviderController.updateAvailability');
        res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Search providers
   * GET /api/providers/search
   */
  static search = [
    validate([
      query('serviceCategoryId')
        .optional()
        .isUUID()
        .withMessage('Valid service category ID is required'),
      query('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Valid latitude is required'),
      query('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Valid longitude is required'),
      query('maxDistance')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Max distance must be a positive number'),
      query('minRating')
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage('Min rating must be between 0 and 5'),
      query('minPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Min price must be a positive number'),
      query('maxPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Max price must be a positive number'),
      query('availability')
        .optional()
        .isIn(['available', 'busy', 'offline'])
        .withMessage('Valid availability status is required'),
      query('isVerified')
        .optional()
        .isBoolean()
        .withMessage('isVerified must be a boolean'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('cursor')
        .optional()
        .isString()
        .withMessage('cursor must be a string'),
    ]),
    async (req: Request, res: Response) => {
      try {
        const filters: any = {};

        if (req.query.serviceCategoryId) {
          filters.serviceCategoryId = req.query.serviceCategoryId as string;
        }
        if (req.query.latitude) {
          filters.latitude = parseFloat(req.query.latitude as string);
        }
        if (req.query.longitude) {
          filters.longitude = parseFloat(req.query.longitude as string);
        }
        if (req.query.maxDistance) {
          filters.maxDistance = parseFloat(req.query.maxDistance as string);
        }
        if (req.query.minRating) {
          filters.minRating = parseFloat(req.query.minRating as string);
        }
        if (req.query.minPrice) {
          filters.minPrice = parseFloat(req.query.minPrice as string);
        }
        if (req.query.maxPrice) {
          filters.maxPrice = parseFloat(req.query.maxPrice as string);
        }
        if (req.query.availability) {
          filters.availability = req.query.availability as ProviderAvailability;
        }
        if (req.query.isVerified !== undefined) {
          filters.isVerified = req.query.isVerified === 'true';
        }
        if (req.query.limit) {
          filters.limit = parseInt(req.query.limit as string, 10);
        }
        if (req.query.cursor) {
          filters.cursor = req.query.cursor as string;
        }

        const providers = await ProviderService.searchProviders(filters);

        res.json({
          status: 'success',
          data: providers,
          count: providers.length,
        });
      } catch (error: any) {
        logError(error.message, 'ProviderController.search');
        res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Add portfolio image
   * POST /api/providers/:id/portfolio
   */
  static addPortfolioImage = [
    validate([
      body('imageUrl').optional().isURL().withMessage('Valid image URL is required'),
      body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const providerId = req.params.id;
        const uploadedImage = (req as any).file as Express.Multer.File | undefined;
        const { imageUrl, description } = req.body;

        if (!uploadedImage && !imageUrl) {
          logError('Either imageUrl or an image file is required', 'ProviderController.addPortfolioImage');
          return res.status(400).json({
            status: 'error',
            message: 'Either imageUrl or an image file is required',
          });
        }

        // Verify provider ownership before uploading
        const myProvider = await ProviderService.getProfileByUserId(userId);
        if (!myProvider || myProvider.id !== providerId) {
          logError('Unauthorized: You can only add to your own portfolio', 'ProviderController.addPortfolioImage');
          return res.status(403).json({
            status: 'error',
            message: 'Unauthorized: You can only add to your own portfolio',
          });
        }

        let finalImageUrl = imageUrl;
        if (uploadedImage) {
          if (!uploadedImage.mimetype?.toLowerCase().startsWith('image/')) {
            logError('Uploaded portfolio image must be an image', 'ProviderController.addPortfolioImage');
            return res.status(400).json({
              status: 'error',
              message: 'Uploaded portfolio image must be an image',
            });
          }

          const ext = this.getFileExtension(uploadedImage);
          const namePart = crypto.randomBytes(8).toString('hex');
          const filePath = `providers/${providerId}/portfolio/image-${Date.now()}-${namePart}${ext}`;
          const { url } = await StorageService.uploadImage({
            path: filePath,
            contentType: uploadedImage.mimetype,
            file: uploadedImage.buffer,
          });
          finalImageUrl = url;
        }

        const portfolio = await ProviderService.addPortfolioImage(
          providerId,
          userId,
          finalImageUrl,
          description
        );

        console.log("Portfolio image added successfully:", portfolio); 

        return res.status(201).json({
          status: 'success',
          data: portfolio,
        });
      } catch (error: any) {
        logError(error.message, 'ProviderController.addPortfolioImage');
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Get portfolio images
   * GET /api/providers/:id/portfolio
   */
  static getPortfolio = async (req: Request, res: Response) => {
    try {
      const portfolio = await ProviderService.getPortfolio(req.params.id);
      res.json({
        status: 'success',
        data: portfolio,
      });
    } catch (error: any) {
      logError(error.message, 'ProviderController.getPortfolio');
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * Delete portfolio image
   * DELETE /api/providers/:id/portfolio/:portfolioId
   */
  static deletePortfolioImage = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const providerId = req.params.id;
      const portfolioId = req.params.portfolioId;

      await ProviderService.deletePortfolioImage(portfolioId, providerId, userId);

      res.json({
        status: 'success',
        message: 'Portfolio image deleted successfully',
      });
    } catch (error: any) {
      logError(error.message, 'ProviderController.deletePortfolioImage');
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * Submit verification request
   * POST /api/providers/:id/verification
   */
  static submitVerification = [
    validate([
      body('idDocument')
        .optional()
        .isString()
        .withMessage('ID document must be a string (URL)'),
      body('certificates')
        .optional()
        .isArray()
        .withMessage('Certificates must be an array'),
      body('references')
        .optional()
        .isArray()
        .withMessage('References must be an array'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const providerId = req.params.id;
        const { idDocument, certificates, references } = req.body;

        const request = await ProviderService.submitVerification(
          providerId,
          userId,
          {
            idDocument,
            certificates,
            references,
          }
        );

        res.status(201).json({
          status: 'success',
          data: request,
          message: 'Verification request submitted successfully',
        });
      } catch (error: any) {
        logError(error.message, 'ProviderController.submitVerification');
        res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Get verification request
   * GET /api/providers/:id/verification
   */
  static getVerificationRequest = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const providerId = req.params.id;

      const request = await ProviderService.getVerificationRequest(
        providerId,
        userId
      );

      if (!request) {
        logError('Verification request not found', 'ProviderController.getVerificationRequest');
        return res.status(404).json({
          status: 'error',
          message: 'Verification request not found',
        });
      }

      console.log("Verification request fetched successfully:", request); 

      return res.json({
        status: 'success',
        data: request,
      });
    } catch (error: any) {
      logError(error.message, 'ProviderController.getVerificationRequest');
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  };

  /**
   * Get provider statistics
   * GET /api/providers/me/stats
   */
  static getStats = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const stats = await ProviderService.getStats(userId);
      res.json({
        status: 'success',
        data: stats,
      });
    } catch (error: any) {
      logError(error.message, 'ProviderController.getStats');
      res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  };
}
