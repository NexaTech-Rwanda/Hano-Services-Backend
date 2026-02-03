import { Router } from 'express';
import { ProviderController } from '../controllers/provider.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import { createResourceLimiter } from '../middleware/rateLimit';

const router = Router();

/**
 * @swagger
 * /providers/search:
 *   get:
 *     summary: Search providers with filters
 *     tags: [Providers]
 *     parameters:
 *       - in: query
 *         name: serviceCategoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by service category
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           format: float
 *         description: User latitude for distance calculation
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           format: float
 *         description: User longitude for distance calculation
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: number
 *           format: float
 *         description: Maximum distance in kilometers
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 5
 *         description: Minimum rating
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           format: float
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           format: float
 *         description: Maximum price
 *       - in: query
 *         name: availability
 *         schema:
 *           type: string
 *           enum: [available, busy, offline]
 *         description: Filter by availability status
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: List of providers matching the search criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Provider'
 *                 count:
 *                   type: integer
 *                   example: 10
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/search', ProviderController.search);

/**
 * @swagger
 * /providers/{id}:
 *   get:
 *     summary: Get provider profile by ID
 *     tags: [Providers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Provider ID
 *     responses:
 *       200:
 *         description: Provider profile details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/Provider'
 *       404:
 *         description: Provider not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', ProviderController.getById);

/**
 * @swagger
 * /providers/{id}/portfolio:
 *   get:
 *     summary: Get provider portfolio images
 *     tags: [Providers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Provider ID
 *     responses:
 *       200:
 *         description: List of portfolio images
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PortfolioImage'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/:id/portfolio', ProviderController.getPortfolio);

/**
 * @swagger
 * /providers:
 *   post:
 *     summary: Create provider profile (Provider only)
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - serviceCategoryId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               serviceCategoryId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               photo:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/photo.jpg"
 *               priceRangeMin:
 *                 type: number
 *                 example: 10000
 *               priceRangeMax:
 *                 type: number
 *                 example: 50000
 *               yearsOfExperience:
 *                 type: integer
 *                 example: 5
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: -1.9441
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: 30.0619
 *               address:
 *                 type: string
 *                 example: "Kigali, Rwanda"
 *     responses:
 *       201:
 *         description: Provider profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/Provider'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', createResourceLimiter, authenticate, authorize(UserRole.PROVIDER), ProviderController.create);

/**
 * @swagger
 * /providers/me/profile:
 *   get:
 *     summary: Get current user's provider profile (Provider only)
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider profile details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/Provider'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Provider profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me/profile', authenticate, authorize(UserRole.PROVIDER), ProviderController.getMyProfile);

/**
 * @swagger
 * /providers/{id}:
 *   put:
 *     summary: Update provider profile (Provider only)
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Provider ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               photo:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/photo.jpg"
 *               serviceCategoryId:
 *                 type: string
 *                 format: uuid
 *               priceRangeMin:
 *                 type: number
 *                 example: 10000
 *               priceRangeMax:
 *                 type: number
 *                 example: 50000
 *               yearsOfExperience:
 *                 type: integer
 *                 example: 5
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: -1.9441
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: 30.0619
 *               address:
 *                 type: string
 *                 example: "Kigali, Rwanda"
 *     responses:
 *       200:
 *         description: Provider profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/Provider'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.put('/:id', authenticate, authorize(UserRole.PROVIDER), ProviderController.update);

/**
 * @swagger
 * /providers/{id}/availability:
 *   patch:
 *     summary: Update provider availability status (Provider only)
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Provider ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - availability
 *             properties:
 *               availability:
 *                 type: string
 *                 enum: [available, busy, offline]
 *                 example: "available"
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/Provider'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.patch('/:id/availability', authenticate, authorize(UserRole.PROVIDER), ProviderController.updateAvailability);

/**
 * @swagger
 * /providers/{id}/portfolio:
 *   post:
 *     summary: Add portfolio image (Provider only)
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Provider ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/image.jpg"
 *               description:
 *                 type: string
 *                 example: "Completed bathroom renovation"
 *     responses:
 *       201:
 *         description: Portfolio image added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/PortfolioImage'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/:id/portfolio', createResourceLimiter, authenticate, authorize(UserRole.PROVIDER), ProviderController.addPortfolioImage);

/**
 * @swagger
 * /providers/{id}/portfolio/{portfolioId}:
 *   delete:
 *     summary: Delete portfolio image (Provider only)
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Provider ID
 *       - in: path
 *         name: portfolioId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Portfolio image ID
 *     responses:
 *       200:
 *         description: Portfolio image deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Portfolio image deleted successfully"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.delete('/:id/portfolio/:portfolioId', createResourceLimiter, authenticate, authorize(UserRole.PROVIDER), ProviderController.deletePortfolioImage);

/**
 * @swagger
 * /providers/{id}/verification:
 *   post:
 *     summary: Submit verification request (Provider only)
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Provider ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idDocument:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/id-document.jpg"
 *               certificates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 example: ["https://example.com/cert1.jpg", "https://example.com/cert2.jpg"]
 *               references:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Reference 1", "Reference 2"]
 *     responses:
 *       201:
 *         description: Verification request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/VerificationRequest'
 *                 message:
 *                   type: string
 *                   example: "Verification request submitted successfully"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/:id/verification', createResourceLimiter, authenticate, authorize(UserRole.PROVIDER), ProviderController.submitVerification);

/**
 * @swagger
 * /providers/{id}/verification:
 *   get:
 *     summary: Get verification request (Provider only)
 *     tags: [Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Provider ID
 *     responses:
 *       200:
 *         description: Verification request details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/VerificationRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Verification request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/verification', authenticate, authorize(UserRole.PROVIDER), ProviderController.getVerificationRequest);

export default router;
