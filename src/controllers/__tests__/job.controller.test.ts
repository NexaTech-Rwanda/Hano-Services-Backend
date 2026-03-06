/**
 * Job Controller Unit Tests
 * Tests HTTP layer for job posting and management endpoints
 * Note: JobController uses JobModel directly without a JobService
 */

import { Response } from 'express';
import { JobController } from '../../controllers/job.controller';
import { JobModel } from '../../models/Job';
import { AuthRequest } from '../../middleware/auth';
import { UserRole } from '../../types';

jest.mock('../../models/Job');
jest.mock('../../config/config', () => ({
  config: {
    jwt: { secret: 'test-secret', expiresIn: '1h', refreshExpiresInDays: 30 },
    nodeEnv: 'test',
  },
}));

function createMockAuthReqRes(overrides: any = {}): {
  req: Partial<AuthRequest>;
  res: Partial<Response> & { json: jest.Mock; status: jest.Mock };
} {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const req = {
    body: {},
    params: {},
    query: {},
    headers: {},
    userId: 'customer-uuid-1',
    userRole: UserRole.CUSTOMER,
    ...overrides,
  };
  return { req: req as any, res: res as any };
}

function getHandler(controllerMethod: any[] | Function): Function {
  if (Array.isArray(controllerMethod)) {
    return controllerMethod[controllerMethod.length - 1];
  }
  return controllerMethod;
}

const mockJob = {
  id: 'job-uuid-1',
  customerId: 'customer-uuid-1',
  title: 'Fix Kitchen Sink',
  description: 'Leaking kitchen sink needs repair',
  serviceCategoryId: 'cat-plumbing',
  status: 'open',
  budget: 10000,
  locationAddress: 'Kigali',
  createdAt: new Date(),
};

describe('JobController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Create Job ──────────────────────────────────────────────────
  describe('create', () => {
    it('should return 201 on successful job creation', async () => {
      (JobModel.create as jest.Mock).mockResolvedValue(mockJob);

      const { req, res } = createMockAuthReqRes({
        body: {
          title: 'Fix Kitchen Sink',
          description: 'Leaking kitchen sink',
          serviceCategoryId: 'cat-plumbing',
          budget: 10000,
        },
      });

      const handler = getHandler(JobController.create);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ job: mockJob }),
        })
      );
    });

    it('should return 500 on creation error', async () => {
      (JobModel.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const { req, res } = createMockAuthReqRes({
        body: { title: 'Job', serviceCategoryId: 'cat-1', description: 'desc', budget: 100 },
      });

      const handler = getHandler(JobController.create);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── List Available Jobs ─────────────────────────────────────────
  describe('list', () => {
    it('should return 200 with available jobs for providers', async () => {
      (JobModel.listForProviders as jest.Mock).mockResolvedValue([mockJob]);

      const { req, res } = createMockAuthReqRes({
        userRole: UserRole.PROVIDER,
        query: { limit: '10' },
      });

      const handler = getHandler(JobController.list);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ jobs: [mockJob] }),
        })
      );
    });
  });

  // ─── Get My Jobs ─────────────────────────────────────────────────
  describe('getMyJobs', () => {
    it('should return 200 with customer\'s jobs', async () => {
      (JobModel.findByCustomerId as jest.Mock).mockResolvedValue([mockJob]);

      const { req, res } = createMockAuthReqRes();

      const handler = getHandler(JobController.getMyJobs);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ─── Get Job By ID ───────────────────────────────────────────────
  describe('getById', () => {
    it('should return 200 with job details', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue(mockJob);

      const { req, res } = createMockAuthReqRes({
        params: { id: 'job-uuid-1' },
      });

      const handler = getHandler(JobController.getById);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when job not found', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue(null);

      const { req, res } = createMockAuthReqRes({
        params: { id: 'nonexistent' },
      });

      const handler = getHandler(JobController.getById);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ─── Assign to Provider ──────────────────────────────────────────
  describe('assignToProvider', () => {
    it('should return 200 on successful assignment', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue(mockJob);
      (JobModel.update as jest.Mock).mockResolvedValue({
        ...mockJob,
        assignedProviderId: 'provider-uuid-1',
        status: 'assigned',
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'job-uuid-1' },
        userRole: UserRole.PROVIDER,
        userId: 'provider-user-uuid',
      });
      
      // In HanoServices, provider user has a provider profile id
      // The controller likely fetches it or assumes it
      // Let's mock ProviderModel too if needed, but JobController seems to trust req.userId
      
      const handler = getHandler(JobController.assignToProvider);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when job is not open', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue({
        ...mockJob,
        status: 'assigned',
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'job-uuid-1' },
        userRole: UserRole.PROVIDER,
      });

      const handler = getHandler(JobController.assignToProvider);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── Update Job Status ───────────────────────────────────────────
  describe('updateStatus', () => {
    it('should return 200 on successful status update', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue(mockJob);
      (JobModel.update as jest.Mock).mockResolvedValue({
        ...mockJob,
        status: 'in_progress',
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'job-uuid-1' },
        body: { status: 'in_progress' },
      });

      const handler = getHandler(JobController.updateStatus);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 for unauthorized status change', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue(mockJob);

      const { req, res } = createMockAuthReqRes({
        params: { id: 'job-uuid-1' },
        body: { status: 'completed' },
        userId: 'other-user',
      });

      const handler = getHandler(JobController.updateStatus);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── Update Job Details ──────────────────────────────────────────
  describe('update', () => {
    it('should return 200 on successful update', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue(mockJob);
      (JobModel.update as jest.Mock).mockResolvedValue({
        ...mockJob,
        title: 'Updated Title',
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'job-uuid-1' },
        body: { title: 'Updated Title' },
      });

      const handler = getHandler(JobController.update);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when job is not open', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue({
        ...mockJob,
        status: 'assigned',
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'job-uuid-1' },
        body: { title: 'Updated' },
      });

      const handler = getHandler(JobController.update);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── Delete Job ──────────────────────────────────────────────────
  describe('delete', () => {
    it('should return 200 on successful deletion', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue(mockJob);
      (JobModel.delete as jest.Mock).mockResolvedValue(true);

      const { req, res } = createMockAuthReqRes({
        params: { id: 'job-uuid-1' },
      });

      const handler = getHandler(JobController.delete);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when job not found', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue(null);

      const { req, res } = createMockAuthReqRes({
        params: { id: 'nonexistent' },
      });

      const handler = getHandler(JobController.delete);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when not the job owner', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue(mockJob);

      const { req, res } = createMockAuthReqRes({
        params: { id: 'job-uuid-1' },
        userId: 'other-user',
      });

      const handler = getHandler(JobController.delete);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
