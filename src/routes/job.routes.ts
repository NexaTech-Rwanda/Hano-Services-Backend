import { Router } from 'express';
import { JobController } from '../controllers/job.controller';
import { JobBidController } from '../controllers/job-bid.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       required:
 *         - customerId
 *         - serviceCategoryIdx
 *         - title
 *         - description
 *         - budget
 *         - status
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Auto-generated unique identifier
 *         customerId:
 *           type: string
 *           format: uuid
 *           description: ID of the customer who posted the job
 *         serviceCategoryId:
 *           type: string
 *           format: uuid
 *           description: ID of the service category
 *         title:
 *           type: string
 *           description: Job title
 *         description:
 *           type: string
 *           description: Detailed description of the job
 *         budget:
 *           type: number
 *           format: float
 *           description: Budget offered for the job
 *         locationAddress:
 *           type: string
 *           description: Human-readable address
 *         latitude:
 *           type: number
 *           format: float
 *           description: Latitude for location-based search
 *         longitude:
 *           type: number
 *           format: float
 *           description: Longitude for location-based search
 *         deadline:
 *           type: string
 *           format: date-time
 *           description: Deadline for job completion
 *         status:
 *           type: string
 *           enum: [open, assigned, in_progress, completed, cancelled]
 *           description: Current status of the job
 *         assignedProviderId:
 *           type: string
 *           format: uuid
 *           description: ID of the assigned provider (if any)
 *         assignedAt:
 *           type: string
 *           format: date-time
 *           description: When the job was assigned
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: When the job was completed
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the job was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the job was last updated
 */

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job posting (customer only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceCategoryId
 *               - title
 *               - description
 *               - budget
 *             properties:
 *               serviceCategoryId:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *                 format: float
 *               locationAddress:
 *                 type: string
 *               latitude:
 *                 type: number
 *                 format: float
 *               longitude:
 *                 type: number
 *                 format: float
 *               deadline:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a customer)
 */
router.post('/', ...JobController.create);

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: List jobs available for providers (provider only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
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
 *         description: Provider latitude (for distance filtering)
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           format: float
 *         description: Provider longitude (for distance filtering)
 *       - in: query
 *         name: maxDistanceKm
 *         schema:
 *           type: number
 *           format: float
 *         description: Max distance in kilometers (requires lat/long)
 *       - in: query
 *         name: minBudget
 *         schema:
 *           type: number
 *           format: float
 *         description: Minimum budget filter
 *       - in: query
 *         name: maxBudget
 *         schema:
 *           type: number
 *           format: float
 *         description: Maximum budget filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, assigned, in_progress, completed, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: List of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a provider)
 */
router.get('/', ...JobController.list);

/**
 * @swagger
 * /api/jobs/my:
 *   get:
 *     summary: Get current user's (customer) posted jobs
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, assigned, in_progress, completed, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: List of user's jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a customer)
 */
router.get('/my', ...JobController.getMyJobs);

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get a single job by ID
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found
 */
router.get('/:id', JobController.getById);

/**
 * @swagger
 * /api/jobs/{id}:
 *   patch:
 *     summary: Update job details (customer only, only if job is open)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *                 format: float
 *               locationAddress:
 *                 type: string
 *               latitude:
 *                 type: number
 *                 format: float
 *               longitude:
 *                 type: number
 *                 format: float
 *               deadline:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Job updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       400:
 *         description: Bad request or job not open
 *       403:
 *         description: Forbidden (not owner or not a customer)
 *       404:
 *         description: Job not found
 */
router.patch('/:id', ...JobController.update);

/**
 * @swagger
 * /api/jobs/{id}:
 *   delete:
 *     summary: Delete a job (customer only, only if job is open)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request or job not open
 *       403:
 *         description: Forbidden (not owner or not a customer)
 *       404:
 *         description: Job not found
 */
router.delete('/:id', JobController.delete);

/**
 * @swagger
 * /api/jobs/{id}/assign:
 *   patch:
 *     summary: Provider claims/assigns themselves to a job (provider only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job assigned to provider
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       400:
 *         description: Job not open for assignment
 *       403:
 *         description: Forbidden (not a provider)
 *       404:
 *         description: Job not found
 */
router.patch('/:id/assign', JobController.assignToProvider);

/**
 * @swagger
 * /api/jobs/{id}/status:
 *   patch:
 *     summary: Update job status (customer or assigned provider)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, assigned, in_progress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Job status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden (not owner or not assigned provider)
 *       404:
 *         description: Job not found
 */
router.patch('/:id/status', ...JobController.updateStatus);

/**
 * @swagger
 * /api/jobs/{id}/bids:
 *   post:
 *     summary: Place a bid on a job (provider only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bidAmount
 *             properties:
 *               bidAmount:
 *                 type: number
 *               proposalText:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bid placed successfully
 *   get:
 *     summary: List bids for a job (customer only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of bids
 */
router.post('/:id/bids', JobBidController.placeBid);
router.get('/:id/bids', JobBidController.listBids);

/**
 * @swagger
 * /api/jobs/{id}/bids/{bidId}/accept:
 *   patch:
 *     summary: Accept a bid for a job (customer only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: bidId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Bid accepted and job assigned
 */
router.patch('/:id/bids/:bidId/accept', JobBidController.acceptBid);

export default router;
