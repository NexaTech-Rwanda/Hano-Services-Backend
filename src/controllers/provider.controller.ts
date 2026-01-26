import { Request, Response } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validation';
import { AuthRequest } from '../middleware/auth';
import { ProviderService } from '../services/provider.service';
import { ProviderAvailability } from '../types';

export class ProviderController {
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
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
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
        } = req.body;

        const provider = await ProviderService.createProfile(
          userId,
          name,
          serviceCategoryId,
          {
            photo,
            priceRangeMin,
            priceRangeMax,
            yearsOfExperience,
            latitude,
            longitude,
            address,
          }
        );

        res.status(201).json({
          status: 'success',
          data: provider,
        });
      } catch (error: any) {
        res.status(400).json({
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
      const provider = await ProviderService.getProfileByUserId(userId);
      res.json({
        status: 'success',
        data: provider,
      });
    } catch (error: any) {
      res.status(404).json({
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
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const providerId = req.params.id;
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
        } = req.body;

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
        });

        res.json({
          status: 'success',
          data: provider,
        });
      } catch (error: any) {
        res.status(400).json({
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
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
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
          filters.limit = parseInt(req.query.limit as string);
        }
        if (req.query.offset) {
          filters.offset = parseInt(req.query.offset as string);
        }

        const providers = await ProviderService.searchProviders(filters);

        res.json({
          status: 'success',
          data: providers,
          count: providers.length,
        });
      } catch (error: any) {
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
      body('imageUrl').isURL().withMessage('Valid image URL is required'),
      body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const providerId = req.params.id;
        const { imageUrl, description } = req.body;

        const portfolio = await ProviderService.addPortfolioImage(
          providerId,
          userId,
          imageUrl,
          description
        );

        res.status(201).json({
          status: 'success',
          data: portfolio,
        });
      } catch (error: any) {
        res.status(400).json({
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
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
  };
}
