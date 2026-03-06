import { Response } from 'express';
import { JobBidController } from '../job-bid.controller';
import { JobBidModel } from '../../models/JobBid';
import { JobModel } from '../../models/Job';
import { PushNotificationService } from '../../services/push-notification.service';

jest.mock('../../models/JobBid');
jest.mock('../../models/Job');
jest.mock('../../services/push-notification.service');

function createMockReqRes(overrides: any = {}) {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const req = {
    body: {},
    params: {},
    user: { id: 'user-1', providerId: 'provider-1' },
    ...overrides,
  };
  return { req: req as any, res: res as any };
}

describe('JobBidController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('placeBid', () => {
    it('should place a bid successfully', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'job-1' },
        body: { bidAmount: 5000, proposalText: 'I can do this!' }
      });

      (JobModel.findById as jest.Mock).mockResolvedValue({ id: 'job-1', status: 'open', customerId: 'customer-1', title: 'Test Job' });
      (JobBidModel.create as jest.Mock).mockResolvedValue({ id: 'bid-1', bidAmount: 5000 });
      (PushNotificationService.sendToUser as jest.Mock).mockResolvedValue(true);

      await JobBidController.placeBid(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(JobBidModel.create).toHaveBeenCalled();
      expect(PushNotificationService.sendToUser).toHaveBeenCalledWith('customer-1', expect.any(Object));
    });

    it('should return 403 if user is not a provider', async () => {
      const { req, res } = createMockReqRes({
        user: { id: 'user-1' } // No providerId
      });

      await JobBidController.placeBid(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Only providers can place bids' });
    });

    it('should return 400 if bidAmount is missing', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'job-1' },
        body: { proposalText: 'Test' }
      });

      await JobBidController.placeBid(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Bid amount is required' });
    });

    it('should return 404 if job not found', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'job-99' },
        body: { bidAmount: 1000 }
      });

      (JobModel.findById as jest.Mock).mockResolvedValue(null);

      await JobBidController.placeBid(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Job not found' });
    });

    it('should return 400 if job is not open', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'job-1' },
        body: { bidAmount: 1000 }
      });

      (JobModel.findById as jest.Mock).mockResolvedValue({ id: 'job-1', status: 'assigned' });

      await JobBidController.placeBid(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Job is no longer open for bids' });
    });
  });

  describe('listBids', () => {
    it('should list bids for job owner', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'job-1' },
        user: { id: 'customer-1' }
      });

      (JobModel.findById as jest.Mock).mockResolvedValue({ id: 'job-1', customerId: 'customer-1' });
      (JobBidModel.findByJobId as jest.Mock).mockResolvedValue([{ id: 'bid-1' }]);

      await JobBidController.listBids(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ id: 'bid-1' }] }));
    });

    it('should return 403 if not job owner', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'job-1' },
        user: { id: 'other-user' }
      });

      (JobModel.findById as jest.Mock).mockResolvedValue({ id: 'job-1', customerId: 'customer-1' });

      await JobBidController.listBids(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('acceptBid', () => {
    it('should accept bid successfully', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'job-1', bidId: 'bid-1' },
        user: { id: 'customer-1' }
      });

      (JobModel.findById as jest.Mock).mockResolvedValue({ id: 'job-1', customerId: 'customer-1', title: 'Test Job' });
      (JobBidModel.findById as jest.Mock).mockResolvedValue({ id: 'bid-1', jobId: 'job-1', providerId: 'provider-1' });
      (JobBidModel.updateStatus as jest.Mock).mockResolvedValue(true);
      (JobBidModel.rejectOtherBids as jest.Mock).mockResolvedValue(true);
      (JobModel.update as jest.Mock).mockResolvedValue({ id: 'job-1', status: 'assigned' });

      await JobBidController.acceptBid(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(JobBidModel.updateStatus).toHaveBeenCalledWith('bid-1', 'accepted');
      expect(JobBidModel.rejectOtherBids).toHaveBeenCalledWith('job-1', 'bid-1');
      expect(JobModel.update).toHaveBeenCalledWith('job-1', expect.objectContaining({ status: 'assigned' }));
      expect(PushNotificationService.sendToUser).toHaveBeenCalledWith('provider-1', expect.any(Object));
    });

    it('should return 403 if not job owner accepting bid', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'job-1', bidId: 'bid-1' },
        user: { id: 'wrong-user' }
      });

      (JobModel.findById as jest.Mock).mockResolvedValue({ id: 'job-1', customerId: 'customer-1' });

      await JobBidController.acceptBid(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
