import pool from '../config/database';
import { Booking, BookingStatus } from '../types';

export class BookingModel {
  /**
   * Create a new booking
   */
  static async create(
    customerId: string,
    providerId: string,
    serviceCategoryId: string,
    data: {
      scheduledDate?: Date;
      description?: string;
      latitude?: number;
      longitude?: number;
      address?: string;
    }
  ): Promise<Booking> {
    const result = await pool.query(
      `INSERT INTO bookings (
        customer_id, provider_id, service_category_id,
        status, scheduled_date, description,
        latitude, longitude, address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        customerId,
        providerId,
        serviceCategoryId,
        BookingStatus.PENDING,
        data.scheduledDate || null,
        data.description || null,
        data.latitude || null,
        data.longitude || null,
        data.address || null,
      ]
    );

    return this.mapRowToBooking(result.rows[0]);
  }

  /**
   * Find booking by ID
   */
  static async findById(id: string): Promise<Booking | null> {
    const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [
      id,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToBooking(result.rows[0]);
  }

  /**
   * List bookings for a customer
   */
  static async findByCustomerId(customerId: string): Promise<Booking[]> {
    const result = await pool.query(
      `SELECT * FROM bookings
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [customerId]
    );

    return result.rows.map((row) => this.mapRowToBooking(row));
  }

  /**
   * List bookings for a provider
   */
  static async findByProviderId(providerId: string): Promise<Booking[]> {
    const result = await pool.query(
      `SELECT * FROM bookings
       WHERE provider_id = $1
       ORDER BY created_at DESC`,
      [providerId]
    );

    return result.rows.map((row) => this.mapRowToBooking(row));
  }

  /**
   * Update booking status
   */
  static async updateStatus(
    id: string,
    status: BookingStatus
  ): Promise<Booking | null> {
    const result = await pool.query(
      `UPDATE bookings
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToBooking(result.rows[0]);
  }

  /**
   * Update booking details (reschedule / update location / cancel)
   */
  static async update(
    id: string,
    data: {
      scheduledDate?: Date | null;
      description?: string;
      latitude?: number | null;
      longitude?: number | null;
      address?: string | null;
      status?: BookingStatus;
    }
  ): Promise<Booking | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.scheduledDate !== undefined) {
      updates.push(`scheduled_date = $${paramCount++}`);
      values.push(data.scheduledDate);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.latitude !== undefined) {
      updates.push(`latitude = $${paramCount++}`);
      values.push(data.latitude);
    }
    if (data.longitude !== undefined) {
      updates.push(`longitude = $${paramCount++}`);
      values.push(data.longitude);
    }
    if (data.address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(data.address);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE bookings
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToBooking(result.rows[0]);
  }

  private static mapRowToBooking(row: any): Booking {
    return {
      id: row.id,
      customerId: row.customer_id,
      providerId: row.provider_id,
      serviceCategoryId: row.service_category_id,
      status: row.status as BookingStatus,
      scheduledDate: row.scheduled_date,
      description: row.description,
      location:
        row.latitude != null && row.longitude != null
          ? {
              latitude: parseFloat(row.latitude),
              longitude: parseFloat(row.longitude),
              address: row.address,
            }
          : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

