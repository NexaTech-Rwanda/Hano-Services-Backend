import { JobModel, Job, JobStatus } from '../models/Job';
import { PushNotificationService } from './push-notification.service';
import pool from '../config/database';

export class JobService {
  /**
   * Create a new job and notify relevant providers
   */
  static async createJob(data: any): Promise<Job> {
    const job = await JobModel.create(data);

    // Notify providers in the same category
    // This is an async action that shouldn't block the response
    this.notifyProvidersOfNewJob(job).catch(err => 
      console.error('[JobService] Failed to notify providers:', err)
    );

    return job;
  }

  /**
   * Assign a job to a provider (Legacy "Claim" flow)
   */
  static async assignJob(jobId: string, providerId: string): Promise<Job | null> {
    const job = await JobModel.findById(jobId);
    if (!job) return null;

    const updatedJob = await JobModel.update(jobId, {
      status: 'assigned',
      assignedProviderId: providerId,
      assignedAt: new Date(),
    });

    if (updatedJob) {
      // Notify customer that their job was claimed
      await PushNotificationService.sendToUser(job.customerId, {
        title: 'Job Claimed',
        body: `A provider has claimed your job: "${job.title}"`,
        data: { jobId: job.id, type: 'job_assigned' }
      }).catch(err => console.error('[JobService] Notification error:', err));
    }

    return updatedJob;
  }

  /**
   * Update job status and notify parties
   */
  static async updateStatus(jobId: string, status: JobStatus, userId: string): Promise<Job | null> {
    const job = await JobModel.findById(jobId);
    if (!job) return null;

    const updatedJob = await JobModel.update(jobId, { status });

    if (updatedJob) {
      // Logic for notifications based on status
      const recipientId = userId === job.customerId ? job.assignedProviderId : job.customerId;
      
      if (recipientId) {
        await PushNotificationService.sendToUser(recipientId, {
          title: 'Job Status Updated',
          body: `Job "${job.title}" is now ${status.replace('_', ' ')}`,
          data: { jobId: job.id, status }
        }).catch(err => console.error('[JobService] Notification error:', err));
      }
    }

    return updatedJob;
  }

  /**
   * Notify providers in the category about a new job
   */
  private static async notifyProvidersOfNewJob(job: Job): Promise<void> {
    // Find all providers in this category
    const result = await pool.query(
      `SELECT user_id FROM providers WHERE service_category_id = $1 AND availability = 'available'`,
      [job.serviceCategoryId]
    );

    const userIds = result.rows.map(r => r.user_id);
    if (userIds.length > 0) {
      await PushNotificationService.sendToUsers(userIds, {
        title: 'New Job Available',
        body: `A new job "${job.title}" is available in your category.`,
        data: { jobId: job.id, type: 'new_job' }
      });
    }
  }
}
