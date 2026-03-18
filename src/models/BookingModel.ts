import pool from '../config/database';
import { Booking, BookingStatus } from '../types';

export class BookingModel {
  /**
   * Create a new booking request (customer)
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
      notes?: string;
      imageUrl?: string;
    }
  ): Promise<Booking> {
    const result = await pool.query(
      `INSERT INTO bookings (
        customer_id, provider_id, service_category_id,
        scheduled_date, description, latitude, longitude, address, notes, image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        customerId,
        providerId,
        serviceCategoryId,
        data.scheduledDate || null,
        data.description || null,
        data.latitude || null,
        data.longitude || null,
        data.address || null,
        data.notes || null,
        data.imageUrl || null,
      ]
    );

    return this.mapRowToBooking(result.rows[0]);
  }

  /**
   * Find booking by ID
   */
  static async findById(id: string): Promise<Booking | null> {
    const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    return result.rows.length ? this.mapRowToBooking(result.rows[0]) : null;
  }

  /**
   * Find booking by ID with related names/phones
   */
  static async findByIdWithDetails(id: string): Promise<Booking | null> {
    const result = await pool.query(
      `SELECT
        b.*,
        p.name AS provider_name,
        sc.name AS provider_category,
        cu.username AS customer_name,
        pu.phone AS provider_phone,
        cu.phone AS customer_phone
      FROM bookings b
      JOIN providers p ON b.provider_id = p.id
      LEFT JOIN service_categories sc ON b.service_category_id = sc.id
      LEFT JOIN users cu ON b.customer_id = cu.id
      LEFT JOIN users pu ON p.user_id = pu.id
      WHERE b.id = $1
      LIMIT 1`,
      [id]
    );

    return result.rows.length ? this.mapRowToBooking(result.rows[0]) : null;
  }

  /**
   * Update booking status and/or fields
   */
  static async update(
    id: string,
    data: {
      status?: BookingStatus;
      scheduledDate?: Date;
      description?: string;
      latitude?: number;
      longitude?: number;
      address?: string;
      notes?: string;
      imageUrl?: string;
    }
  ): Promise<Booking | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
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
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(data.notes);
    }
    if (data.imageUrl !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(data.imageUrl);
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

    return result.rows.length ? this.mapRowToBooking(result.rows[0]) : null;
  }

  /**
   * List bookings for a customer (their own)
   */
  static async findByCustomerId(
    customerId: string,
    filters?: {
      status?: BookingStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Booking[]> {
    const values: any[] = [customerId];
    let paramCount = 2;
    let whereClause = 'WHERE b.customer_id = $1';

    if (filters?.status) {
      whereClause += ` AND b.status = $${paramCount++}`;
      values.push(filters.status);
    }

    const limit = filters?.limit && filters.limit > 0 && filters.limit <= 100 ? filters.limit : 20;
    const offset = filters?.offset && filters.offset >= 0 ? filters.offset : 0;

    const result = await pool.query(
      `SELECT
         b.*,
         p.name AS provider_name,
         sc.name AS provider_category,
         cu.username AS customer_name,
         pu.phone AS provider_phone,
         cu.phone AS customer_phone
       FROM bookings b
       JOIN providers p ON b.provider_id = p.id
       LEFT JOIN service_categories sc ON b.service_category_id = sc.id
       LEFT JOIN users cu ON b.customer_id = cu.id
       LEFT JOIN users pu ON p.user_id = pu.id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      [...values, limit, offset]
    );

    return result.rows.map((row) => this.mapRowToBooking(row));
  }

  /**
   * List bookings for a provider (assigned to them)
   */
  static async findByProviderId(
    providerId: string,
    filters?: {
      status?: BookingStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Booking[]> {
    const values: any[] = [providerId];
    let paramCount = 2;
    let whereClause = 'WHERE b.provider_id = $1';

    if (filters?.status) {
      whereClause += ` AND b.status = $${paramCount++}`;
      values.push(filters.status);
    }

    const limit = filters?.limit && filters.limit > 0 && filters.limit <= 100 ? filters.limit : 20;
    const offset = filters?.offset && filters.offset >= 0 ? filters.offset : 0;

    const result = await pool.query(
      `SELECT
         b.*,
         p.name AS provider_name,
         sc.name AS provider_category,
         cu.username AS customer_name,
         pu.phone AS provider_phone,
         cu.phone AS customer_phone
       FROM bookings b
       JOIN providers p ON b.provider_id = p.id
       LEFT JOIN service_categories sc ON b.service_category_id = sc.id
       LEFT JOIN users cu ON b.customer_id = cu.id
       LEFT JOIN users pu ON p.user_id = pu.id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      [...values, limit, offset]
    );

    return result.rows.map((row) => this.mapRowToBooking(row));
  }

  /**
   * Delete a booking (soft cancel via status)
   */
  static async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM bookings WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private static mapRowToBooking(row: any): Booking {
    const latitude = row.latitude != null ? parseFloat(row.latitude) : undefined;
    const longitude = row.longitude != null ? parseFloat(row.longitude) : undefined;
    const address = row.address ?? undefined;
    return {
      id: row.id,
      customerId: row.customer_id,
      providerId: row.provider_id,
      serviceCategoryId: row.service_category_id,
      status: row.status,
      scheduledDate: row.scheduled_date,
      description: row.description,
      latitude,
      longitude,
      address,
      location:
        latitude != null && longitude != null
          ? {
              latitude,
              longitude,
              address,
            }
          : undefined,
      notes: row.notes,
      imageUrl: row.image_url,
      providerName: row.provider_name ?? undefined,
      providerCategory: row.provider_category ?? undefined,
      customerName: row.customer_name ?? undefined,
      providerPhone: row.provider_phone ?? undefined,
      customerPhone: row.customer_phone ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
