import { JobService } from '../job.service';
import { JobModel } from '../../models/Job';
import { PushNotificationService } from '../push-notification.service';
import { JobStatus } from '../../models/Job';

jest.mock('../../models/Job');
jest.mock('../push-notification.service');

describe('JobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a job and notify/log (log covered by console)', async () => {
      const jobData = { customerId: 'cust-1', title: 'Test', description: 'Desc', budget: 1000, serviceCategoryId: 'cat-1' };
      (JobModel.create as jest.Mock).mockResolvedValue({ id: 'job-1', ...jobData });

      const result = await JobService.createJob(jobData);

      expect(result.id).toBe('job-1');
      expect(JobModel.create).toHaveBeenCalledWith(jobData);
    });
  });

  describe('assignJob', () => {
    it('should assign job and notify customer', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue({ id: 'job-1', customerId: 'cust-1', title: 'Test Job' });
      (JobModel.update as jest.Mock).mockResolvedValue({ id: 'job-1', status: 'assigned', assignedProviderId: 'prov-1' });

      await JobService.assignJob('job-1', 'prov-1');

      expect(JobModel.update).toHaveBeenCalledWith('job-1', expect.objectContaining({ assignedProviderId: 'prov-1', status: 'assigned' }));
      expect(PushNotificationService.sendToUser).toHaveBeenCalledWith('cust-1', expect.objectContaining({ title: 'Job Claimed' }));
    });
  });

  describe('updateStatus', () => {
    it('should notify provider when customer completes job', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue({ id: 'job-1', customerId: 'cust-1', assignedProviderId: 'prov-1', title: 'Test Job' });
      (JobModel.update as jest.Mock).mockResolvedValue({ id: 'job-1', status: 'completed' });

      await JobService.updateStatus('job-1', 'completed' as JobStatus, 'cust-1');

      expect(PushNotificationService.sendToUser).toHaveBeenCalledWith('prov-1', expect.objectContaining({ title: 'Job Completed' }));
    });

    it('should notify customer when provider starts job (in_progress)', async () => {
      (JobModel.findById as jest.Mock).mockResolvedValue({ id: 'job-1', customerId: 'cust-1', assignedProviderId: 'prov-1', title: 'Test Job' });
      (JobModel.update as jest.Mock).mockResolvedValue({ id: 'job-1', status: 'in_progress' });

      await JobService.updateStatus('job-1', 'in_progress' as JobStatus, 'prov-1');

      expect(PushNotificationService.sendToUser).toHaveBeenCalledWith('cust-1', expect.objectContaining({ title: 'Job In Progress' }));
    });
  });
});
