import pool from '../config/database';
import { Review } from '../types';

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
    limit = 50,
    offset = 0
  ): Promise<Review[]> {
    const result = await pool.query(
      `SELECT * FROM reviews
       WHERE provider_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [providerId, limit, offset]
    );

    return result.rows.map((row) => this.mapRowToReview(row));
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

