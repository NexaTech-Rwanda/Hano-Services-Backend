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
  bookingDescription?: string;
  customerName?: string;
  providerName?: string;
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

  static async findByProviderId(
    providerId: string,
    filters?: {
      status?: 'pending' | 'successful' | 'failed';
      limit?: number;
      offset?: number;
    }
  ): Promise<Payment[]> {
    const values: any[] = [providerId];
    const clauses: string[] = ['p.provider_id = $1'];
    let param = 2;

    if (filters?.status) {
      clauses.push(`p.status = $${param++}`);
      values.push(filters.status);
    }

    const limit = filters?.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50;
    const offset = filters?.offset && filters.offset > 0 ? filters.offset : 0;
    values.push(limit);
    values.push(offset);

    const query = `
      SELECT
        p.*,
        b.description AS booking_description,
        cu.username AS customer_name,
        pu.username AS provider_name
      FROM payments p
      LEFT JOIN bookings b ON b.id = p.booking_id
      LEFT JOIN users cu ON cu.id = p.customer_id
      LEFT JOIN providers pr ON pr.id = p.provider_id
      LEFT JOIN users pu ON pu.id = pr.user_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT $${param++}
      OFFSET $${param++}
    `;

    const result = await pool.query(query, values);
    return result.rows.map((row) => this.mapRowToPayment(row));
  }

  static async findByCustomerId(
    customerId: string,
    filters?: {
      status?: 'pending' | 'successful' | 'failed';
      limit?: number;
      offset?: number;
    }
  ): Promise<Payment[]> {
    const values: any[] = [customerId];
    const clauses: string[] = ['p.customer_id = $1'];
    let param = 2;

    if (filters?.status) {
      clauses.push(`p.status = $${param++}`);
      values.push(filters.status);
    }

    const limit = filters?.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50;
    const offset = filters?.offset && filters.offset > 0 ? filters.offset : 0;
    values.push(limit);
    values.push(offset);

    const query = `
      SELECT
        p.*,
        b.description AS booking_description,
        cu.username AS customer_name,
        pu.username AS provider_name
      FROM payments p
      LEFT JOIN bookings b ON b.id = p.booking_id
      LEFT JOIN users cu ON cu.id = p.customer_id
      LEFT JOIN providers pr ON pr.id = p.provider_id
      LEFT JOIN users pu ON pu.id = pr.user_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT $${param++}
      OFFSET $${param++}
    `;

    const result = await pool.query(query, values);
    return result.rows.map((row) => this.mapRowToPayment(row));
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
      bookingDescription: row.booking_description,
      customerName: row.customer_name,
      providerName: row.provider_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
