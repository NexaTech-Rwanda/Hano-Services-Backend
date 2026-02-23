import pool from '../config/database';

export interface JobBid {
  id: string;
  jobId: string;
  providerId: string;
  bidAmount: number;
  proposalText?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: Date;
  updatedAt: Date;
}

export interface JobBidWithProvider extends JobBid {
  providerName: string;
  providerPhoto?: string;
  providerRating?: number;
}

export class JobBidModel {
  static async create(data: {
    jobId: string;
    providerId: string;
    bidAmount: number;
    proposalText?: string;
  }): Promise<JobBid> {
    const result = await pool.query(
      `INSERT INTO job_bids (job_id, provider_id, bid_amount, proposal_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.jobId, data.providerId, data.bidAmount, data.proposalText]
    );

    return this.mapRowToBid(result.rows[0]);
  }

  static async findByJobId(jobId: string): Promise<JobBidWithProvider[]> {
    const result = await pool.query(
      `SELECT 
        jb.*,
        p.name as provider_name,
        p.photo as provider_photo,
        COALESCE(AVG(r.rating), 0) as provider_rating
      FROM job_bids jb
      JOIN providers p ON jb.provider_id = p.id
      LEFT JOIN reviews r ON p.id = r.provider_id
      WHERE jb.job_id = $1
      GROUP BY jb.id, p.id
      ORDER BY jb.created_at DESC`,
      [jobId]
    );

    return result.rows.map(row => ({
      ...this.mapRowToBid(row),
      providerName: row.provider_name,
      providerPhoto: row.provider_photo,
      providerRating: parseFloat(row.provider_rating),
    }));
  }

  static async findById(id: string): Promise<JobBid | null> {
    const result = await pool.query('SELECT * FROM job_bids WHERE id = $1', [id]);
    return result.rows.length ? this.mapRowToBid(result.rows[0]) : null;
  }

  static async updateStatus(id: string, status: JobBid['status']): Promise<JobBid | null> {
    const result = await pool.query(
      `UPDATE job_bids SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, status]
    );
    return result.rows.length ? this.mapRowToBid(result.rows[0]) : null;
  }

  static async rejectOtherBids(jobId: string, acceptedBidId: string): Promise<void> {
    await pool.query(
      `UPDATE job_bids SET status = 'rejected' WHERE job_id = $1 AND id != $2 AND status = 'pending'`,
      [jobId, acceptedBidId]
    );
  }

  private static mapRowToBid(row: any): JobBid {
    return {
      id: row.id,
      jobId: row.job_id,
      providerId: row.provider_id,
      bidAmount: parseFloat(row.bid_amount),
      proposalText: row.proposal_text,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
