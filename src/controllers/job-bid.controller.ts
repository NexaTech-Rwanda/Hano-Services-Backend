import { Request, Response } from 'express';
import { JobBidModel } from '../models/JobBid';
import { JobModel } from '../models/Job';
import { PushNotificationService } from '../services/push-notification.service';
import { logError } from '../utils/logger';

export class JobBidController {
  /**
   * Place a bid on a job
   * POST /api/jobs/:id/bids
   */
  static async placeBid(req: Request, res: Response): Promise<Response> {
    try {
      const { id: jobId } = req.params;
      const { bidAmount, proposalText } = req.body;
      const providerId = (req as any).user?.providerId; // Assuming providerId is attached during auth

      if (!providerId) {
        logError('Only providers can place bids', 'JobBidController.placeBid');
        return res.status(403).json({ error: 'Only providers can place bids' });
      }

      if (!bidAmount) {
        logError('Bid amount is required', 'JobBidController.placeBid');
        return res.status(400).json({ error: 'Bid amount is required' });
      }

      const job = await JobModel.findById(jobId);
      if (!job) {
        logError('Job not found', 'JobBidController.placeBid');
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.status !== 'open') {
        logError('Job is no longer open for bids', 'JobBidController.placeBid');
        return res.status(400).json({ error: 'Job is no longer open for bids' });
      }

      const bid = await JobBidModel.create({
        jobId,
        providerId,
        bidAmount,
        proposalText,
      });

      // Notify customer
      await PushNotificationService.sendToUser(job.customerId, {
        title: 'New Bid Received',
        body: `A provider has placed a bid of ${bidAmount} RWF on your job: "${job.title}"`,
        data: { jobId, bidId: bid.id, type: 'new_bid' }
      }).catch(err => console.error('[JobBidController] Notification error:', err));

      return res.status(201).json({
        message: 'Bid placed successfully',
        data: bid,
      });
    } catch (error: any) {
      logError(error.message, 'JobBidController.placeBid');
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'You have already placed a bid on this job' });
      }
      return res.status(500).json({
        error: error.message || 'Failed to place bid',
      });
    }
  }

  /**
   * List bids for a job (Customer only)
   * GET /api/jobs/:id/bids
   */
  static async listBids(req: Request, res: Response): Promise<Response> {
    try {
      const { id: jobId } = req.params;
      const userId = (req as any).user.id;

      const job = await JobModel.findById(jobId);
      if (!job) {
        logError('Job not found', 'JobBidController.listBids');
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.customerId !== userId) {
        logError('Unauthorized to view bids for this job', 'JobBidController.listBids');
        return res.status(403).json({ error: 'Unauthorized to view bids for this job' });
      }

      const bids = await JobBidModel.findByJobId(jobId);
      return res.status(200).json({
        status: 'success',
        data: bids,
      });
    } catch (error: any) {
      logError(error.message, 'JobBidController.listBids');
      return res.status(500).json({
        error: error.message || 'Failed to list bids',
      });
    }
  }

  /**
   * Accept a bid
   * PATCH /api/jobs/:id/bids/:bidId/accept
   */
  static async acceptBid(req: Request, res: Response): Promise<Response> {
    try {
      const { id: jobId, bidId } = req.params;
      const userId = (req as any).user.id;

      const job = await JobModel.findById(jobId);
      if (!job) {
        logError('Job not found', 'JobBidController.acceptBid');
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.customerId !== userId) {
        logError('Unauthorized', 'JobBidController.acceptBid');
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const bid = await JobBidModel.findById(bidId);
      if (!bid || bid.jobId !== jobId) {
        logError('Bid not found', 'JobBidController.acceptBid');
        return res.status(404).json({ error: 'Bid not found' });
      }

      // 1. Accept the bid
      await JobBidModel.updateStatus(bidId, 'accepted');
      
      // 2. Reject other bids
      await JobBidModel.rejectOtherBids(jobId, bidId);

      // 3. Update job status and assign provider
      await JobModel.update(jobId, {
        status: 'assigned',
        assignedProviderId: bid.providerId,
        assignedAt: new Date(),
      });

      // 4. Notify provider
      await PushNotificationService.sendToUser(bid.providerId, {
        title: 'Bid Accepted!',
        body: `Your bid on job "${job.title}" has been accepted.`,
        data: { jobId, type: 'bid_accepted' }
      }).catch(err => console.error('[JobBidController] Notification error:', err));

      return res.status(200).json({
        message: 'Bid accepted successfully',
        data: { jobId, bidId, providerId: bid.providerId },
      });
    } catch (error: any) {
      logError(error.message, 'JobBidController.acceptBid');
      return res.status(500).json({
        error: error.message || 'Failed to accept bid',
      });
    }
  }
}
