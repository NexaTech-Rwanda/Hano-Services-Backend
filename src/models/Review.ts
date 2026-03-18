import pool from '../config/database';
import { Review } from '../types';
import { decodeCursor, getNextCursor } from '../utils/pagination';

export class ReviewModel {
  /**
   * Create a new review
   */
  static async create(
    bookingId: string,
    customerId: string,
    providerId: string,
    rating: number,
    comment?: string,
    proofImages?: string[]
  ): Promise<Review> {
    const result = await pool.query(
      `INSERT INTO reviews (
        booking_id, customer_id, provider_id,
        rating, comment, proof_images
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        bookingId,
        customerId,
        providerId,
        rating,
        comment || null,
        proofImages || [],
      ]
    );

    return this.mapRowToReview(result.rows[0]);
  }

  /**
   * Find review by ID
   */
  static async findById(id: string): Promise<Review | null> {
    const result = await pool.query('SELECT * FROM reviews WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToReview(result.rows[0]);
  }

  /**
   * Find review by booking (one review per booking)
   */
  static async findByBookingId(bookingId: string): Promise<Review | null> {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE booking_id = $1 LIMIT 1',
      [bookingId]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToReview(result.rows[0]);
  }

  /**
   * List reviews for a provider
   */
  static async findByProviderId(
    providerId: string,
    options: { limit?: number; cursor?: string }
  ): Promise<{ items: Review[]; nextCursor: string | null }> {
    const limit =
      options.limit && options.limit > 0 && options.limit <= 100 ? options.limit : 50;

    const values: any[] = [providerId];
    let paramCount = 2;
    const cursor = decodeCursor(options.cursor);

    let query = `
      SELECT r.*, u.username AS customer_name
      FROM reviews r
      LEFT JOIN users u ON r.customer_id = u.id
      WHERE r.provider_id = $1
    `;
    if (cursor) {
      query += ` AND (r.created_at, r.id) < ($${paramCount}, $${paramCount + 1})`;
      values.push(cursor.createdAt, cursor.id);
      paramCount += 2;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${paramCount}`;
    values.push(limit);

    const result = await pool.query(query, values);
    const items = result.rows.map((row) => this.mapRowToReview(row));
    const nextCursor = getNextCursor(
      items,
      (r) => r.id,
      (r) => r.createdAt
    );

    return { items, nextCursor };
  }

  /**
   * Delete review by ID (admin)
   */
  static async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  private static mapRowToReview(row: any): Review {
    return {
      id: row.id,
      bookingId: row.booking_id,
      customerId: row.customer_id,
      providerId: row.provider_id,
      rating: row.rating,
      comment: row.comment,
      proofImages: row.proof_images || [],
      customerName: row.customer_name || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

