import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { JobModel, JobStatus } from '../models/Job';
import { JobService } from '../services/job.service';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';

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

export class JobController {
  /**
   * Create a new job posting (customer only)
   * POST /api/jobs
   */
  static create = [
    authenticate,
    authorize('customer' as UserRole),
    validate([
      body('serviceCategoryId').isUUID().withMessage('Valid service category ID is required'),
      body('title').notEmpty().withMessage('Title is required'),
      body('description').notEmpty().withMessage('Description is required'),
      body('budget').isFloat({ min: 0 }).withMessage('Budget must be a non-negative number'),
      body('locationAddress').optional().isString().withMessage('Location address must be a string'),
      body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
      body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
      body('deadline').optional().isISO8601().withMessage('Deadline must be a valid date'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const {
          serviceCategoryId,
          title,
          description,
          budget,
          locationAddress,
          latitude,
          longitude,
          deadline,
        } = req.body;

        const job = await JobService.createJob({
          customerId: userId,
          serviceCategoryId,
          title,
          description,
          budget,
          locationAddress,
          latitude,
          longitude,
          deadline: deadline ? new Date(deadline) : undefined,
        });

        return res.status(201).json({
          status: 'success',
          data: job,
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
   * Get jobs available for providers to view/claim
   * GET /api/jobs
   */
  static list = [
    authenticate,
    authorize('provider' as UserRole),
    validate([
      query('serviceCategoryId').optional().isUUID().withMessage('Valid service category ID is required'),
      query('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
      query('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
      query('maxDistanceKm').optional().isFloat({ min: 0 }).withMessage('Max distance must be a positive number'),
      query('minBudget').optional().isFloat({ min: 0 }).withMessage('Min budget must be a non-negative number'),
      query('maxBudget').optional().isFloat({ min: 0 }).withMessage('Max budget must be a non-negative number'),
      query('status').optional().isIn(['open', 'assigned', 'in_progress', 'completed', 'cancelled']).withMessage('Valid status is required'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const filters: any = {};
        if (req.query.serviceCategoryId) filters.serviceCategoryId = req.query.serviceCategoryId as string;
        if (req.query.latitude) filters.latitude = parseFloat(req.query.latitude as string);
        if (req.query.longitude) filters.longitude = parseFloat(req.query.longitude as string);
        if (req.query.maxDistanceKm) filters.maxDistanceKm = parseFloat(req.query.maxDistanceKm as string);
        if (req.query.minBudget) filters.minBudget = parseFloat(req.query.minBudget as string);
        if (req.query.maxBudget) filters.maxBudget = parseFloat(req.query.maxBudget as string);
        if (req.query.status) filters.status = req.query.status as JobStatus;
        if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);

        const jobs = await JobModel.listForProviders(filters);

        return res.json({
          status: 'success',
          data: jobs,
          count: jobs.length,
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
   * Get current user's (customer) posted jobs
   * GET /api/jobs/my
   */
  static getMyJobs = [
    authenticate,
    authorize('customer' as UserRole),
    validate([
      query('status').optional().isIn(['open', 'assigned', 'in_progress', 'completed', 'cancelled']).withMessage('Valid status is required'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const filters: any = {};
        if (req.query.status) filters.status = req.query.status as JobStatus;
        if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);

        const jobs = await JobModel.findByCustomerId(userId, filters);

        return res.json({
          status: 'success',
          data: jobs,
          count: jobs.length,
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
   * Get a single job by ID (any authenticated user)
   * GET /api/jobs/:id
   */
  static getById = [
    authenticate,
    async (req: AuthRequest, res: Response) => {
      try {
        const job = await JobModel.findById(req.params.id);
        if (!job) {
          return res.status(404).json({
            status: 'error',
            message: 'Job not found',
          });
        }

        return res.json({
          status: 'success',
          data: job,
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
   * Provider claims/assigns themselves to a job
   * PATCH /api/jobs/:id/assign
   */
  static assignToProvider = [
    authenticate,
    authorize('provider' as UserRole),
    async (req: AuthRequest, res: Response) => {
      try {
        const jobId = req.params.id;
        const providerId = req.userId!;

        const job = await JobModel.findById(jobId);
        if (!job) {
          return res.status(404).json({
            status: 'error',
            message: 'Job not found',
          });
        }
        if (job.status !== 'open') {
          return res.status(400).json({
            status: 'error',
            message: 'Job is not open for assignment',
          });
        }

        // In a real app, you'd look up provider record from user ID; for simplicity, assume userId maps to provider.id
        const updated = await JobService.assignJob(jobId, providerId);

        return res.json({
          status: 'success',
          data: updated,
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
   * Update job status (customer or assigned provider)
   * PATCH /api/jobs/:id/status
   */
  static updateStatus = [
    authenticate,
    validate([
      body('status').isIn(['open', 'assigned', 'in_progress', 'completed', 'cancelled']).withMessage('Valid status is required'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const jobId = req.params.id;
        const userId = req.userId!;
        const userRole = req.userRole!;
        const { status } = req.body;

        const job = await JobModel.findById(jobId);
        if (!job) {
          return res.status(404).json({
            status: 'error',
            message: 'Job not found',
          });
        }

        // Authorization checks
        if (userRole === 'customer' && job.customerId !== userId) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only update your own jobs',
          });
        }
        if (userRole === 'provider' && job.assignedProviderId !== userId) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only update jobs assigned to you',
          });
        }

        const updated = await JobService.updateStatus(jobId, status, userId);

        return res.json({
          status: 'success',
          data: updated,
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
   * Customer updates their job details (only if job is open)
   * PATCH /api/jobs/:id
   */
  static update = [
    authenticate,
    authorize('customer' as UserRole),
    validate([
      body('title').optional().notEmpty().withMessage('Title cannot be empty'),
      body('description').optional().notEmpty().withMessage('Description cannot be empty'),
      body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a non-negative number'),
      body('locationAddress').optional().isString().withMessage('Location address must be a string'),
      body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
      body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
      body('deadline').optional().isISO8601().withMessage('Deadline must be a valid date'),
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const jobId = req.params.id;
        const userId = req.userId!;
        const {
          title,
          description,
          budget,
          locationAddress,
          latitude,
          longitude,
          deadline,
        } = req.body;

        const job = await JobModel.findById(jobId);
        if (!job) {
          return res.status(404).json({
            status: 'error',
            message: 'Job not found',
          });
        }
        if (job.customerId !== userId) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only update your own jobs',
          });
        }
        if (job.status !== 'open') {
          return res.status(400).json({
            status: 'error',
            message: 'You can only edit jobs that are still open',
          });
        }

        const updated = await JobModel.update(jobId, {
          title,
          description,
          budget,
          locationAddress,
          latitude,
          longitude,
          deadline: deadline ? new Date(deadline) : undefined,
        });

        return res.json({
          status: 'success',
          data: updated,
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
   * Customer deletes their job (only if job is open)
   * DELETE /api/jobs/:id
   */
  static delete = [
    authenticate,
    authorize('customer' as UserRole),
    async (req: AuthRequest, res: Response) => {
      try {
        const jobId = req.params.id;
        const userId = req.userId!;

        const job = await JobModel.findById(jobId);
        if (!job) {
          return res.status(404).json({
            status: 'error',
            message: 'Job not found',
          });
        }
        if (job.customerId !== userId) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only delete your own jobs',
          });
        }
        if (job.status !== 'open') {
          return res.status(400).json({
            status: 'error',
            message: 'You can only delete jobs that are still open',
          });
        }

        await JobModel.delete(jobId);

        return res.json({
          status: 'success',
          message: 'Job deleted successfully',
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
