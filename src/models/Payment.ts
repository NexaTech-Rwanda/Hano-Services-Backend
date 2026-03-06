import pool from '../config/database';

export interface Payment {
  id: string;
  reference: string;
  customerId: string;
  providerId?: string;
  bookingId?: string;
  jobId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'successful' | 'failed';
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentModel {
  static async create(data: {
    reference: string;
    customerId: string;
    providerId?: string;
    bookingId?: string;
    jobId?: string;
    amount: number;
    currency?: string;
    metadata?: any;
  }): Promise<Payment> {
    const result = await pool.query(
      `INSERT INTO payments (
        reference, customer_id, provider_id, booking_id, job_id, amount, currency, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.reference,
        data.customerId,
        data.providerId || null,
        data.bookingId || null,
        data.jobId || null,
        data.amount,
        data.currency || 'RWF',
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    return this.mapRowToPayment(result.rows[0]);
  }

  static async findByReference(reference: string): Promise<Payment | null> {
    const result = await pool.query('SELECT * FROM payments WHERE reference = $1', [reference]);
    return result.rows.length ? this.mapRowToPayment(result.rows[0]) : null;
  }

  static async updateStatus(
    reference: string,
    status: 'successful' | 'failed',
    metadata?: any
  ): Promise<Payment | null> {
    const result = await pool.query(
      `UPDATE payments 
       SET status = $2, metadata = COALESCE($3, metadata), updated_at = CURRENT_TIMESTAMP
       WHERE reference = $1
       RETURNING *`,
      [reference, status, metadata ? JSON.stringify(metadata) : null]
    );

    return result.rows.length ? this.mapRowToPayment(result.rows[0]) : null;
  }

  private static mapRowToPayment(row: any): Payment {
    return {
      id: row.id,
      reference: row.reference,
      customerId: row.customer_id,
      providerId: row.provider_id,
      bookingId: row.booking_id,
      jobId: row.job_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
