import pool from '../config/database';
import {
  Provider,
  ProviderAvailability,
  VerificationStatus,
} from '../types';

export interface ProviderWithCategory extends Provider {
  categoryName?: string;
  averageRating?: number;
  totalReviews?: number;
  portfolioCount?: number;
}

export class ProviderModel {
  /**
   * Create a new provider profile
   */
  static async create(
    userId: string,
    name: string,
    serviceCategoryId: string,
    data: {
      photo?: string;
      priceRangeMin?: number;
      priceRangeMax?: number;
      yearsOfExperience?: number;
      latitude?: number;
      longitude?: number;
      address?: string;
    }
  ): Promise<Provider> {
    const result = await pool.query(
      `INSERT INTO providers (
        user_id, name, photo, service_category_id,
        price_range_min, price_range_max, years_of_experience,
        availability, latitude, longitude, address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        name,
        data.photo || null,
        serviceCategoryId,
        data.priceRangeMin || null,
        data.priceRangeMax || null,
        data.yearsOfExperience || null,
        ProviderAvailability.OFFLINE,
        data.latitude || null,
        data.longitude || null,
        data.address || null,
      ]
    );

    return this.mapRowToProvider(result.rows[0]);
  }

  /**
   * Find provider by ID
   */
  static async findById(id: string): Promise<Provider | null> {
    const result = await pool.query('SELECT * FROM providers WHERE id = $1', [
      id,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToProvider(result.rows[0]);
  }

  /**
   * Find provider by user ID
   */
  static async findByUserId(userId: string): Promise<Provider | null> {
    const result = await pool.query(
      'SELECT * FROM providers WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToProvider(result.rows[0]);
  }

  /**
   * Get provider with additional details (ratings, reviews, portfolio)
   */
  static async findByIdWithDetails(
    id: string
  ): Promise<ProviderWithCategory | null> {
    const result = await pool.query(
      `SELECT 
        p.*,
        sc.name as category_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id) as total_reviews,
        COUNT(DISTINCT pf.id) as portfolio_count
      FROM providers p
      LEFT JOIN service_categories sc ON p.service_category_id = sc.id
      LEFT JOIN reviews r ON p.id = r.provider_id
      LEFT JOIN provider_portfolios pf ON p.id = pf.provider_id
      WHERE p.id = $1
      GROUP BY p.id, sc.name`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToProviderWithDetails(result.rows[0]);
  }

  /**
   * Search providers with filters
   */
  static async search(filters: {
    serviceCategoryId?: string;
    latitude?: number;
    longitude?: number;
    maxDistance?: number; // in kilometers
    minRating?: number;
    minPrice?: number;
    maxPrice?: number;
    availability?: ProviderAvailability;
    isVerified?: boolean;
    limit?: number;
    offset?: number;
    cursor?: string;
  }): Promise<ProviderWithCategory[]> {
    const values: any[] = [];
    let paramCount = 1;

    const hasLocation = filters.latitude != null && filters.longitude != null;
    let userPointExpr = '';
    if (hasLocation) {
      const lonParam = paramCount++;
      values.push(filters.longitude);
      const latParam = paramCount++;
      values.push(filters.latitude);
      userPointExpr = `ST_SetSRID(ST_MakePoint($${lonParam}, $${latParam}), 4326)::geography`;
    }

    let query = `
      SELECT 
        p.*,
        sc.name as category_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT r.id) as total_reviews,
        COUNT(DISTINCT pf.id) as portfolio_count
    `;

    if (hasLocation) {
      query += `,
        (ST_Distance(p.geo_location, ${userPointExpr}) / 1000.0) as distance_km
      `;
    }

    query += `
      FROM providers p
      LEFT JOIN service_categories sc ON p.service_category_id = sc.id
      LEFT JOIN reviews r ON p.id = r.provider_id
      LEFT JOIN provider_portfolios pf ON p.id = pf.provider_id
      WHERE 1=1
    `;

    const conditions: string[] = [];

    if (filters.serviceCategoryId) {
      conditions.push(`p.service_category_id = $${paramCount++}`);
      values.push(filters.serviceCategoryId);
    }

    if (filters.availability) {
      conditions.push(`p.availability = $${paramCount++}`);
      values.push(filters.availability);
    }

    if (filters.isVerified !== undefined) {
      conditions.push(`p.is_verified = $${paramCount++}`);
      values.push(filters.isVerified);
    }

    if (filters.minPrice !== undefined) {
      conditions.push(
        `(p.price_range_min IS NULL OR p.price_range_min >= $${paramCount++})`
      );
      values.push(filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      conditions.push(
        `(p.price_range_max IS NULL OR p.price_range_max <= $${paramCount++})`
      );
      values.push(filters.maxPrice);
    }

    if (hasLocation && filters.maxDistance != null) {
      const maxDistanceMeters = filters.maxDistance * 1000;
      conditions.push(
        `p.geo_location IS NOT NULL AND ST_DWithin(p.geo_location, ${userPointExpr}, $${paramCount++})`
      );
      values.push(maxDistanceMeters);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' GROUP BY p.id, sc.name';

    // Filter by rating (HAVING clause)
    if (filters.minRating !== undefined) {
      query += ` HAVING COALESCE(AVG(r.rating), 0) >= $${paramCount++}`;
      values.push(filters.minRating);
    }

    if (hasLocation) {
      query += ' ORDER BY distance_km ASC NULLS LAST';
    } else {
      query += ' ORDER BY average_rating DESC, total_reviews DESC';
    }

    // Limit (cursor-based; offset is kept for backward-compat at controller level if needed)
    const limit =
      filters.limit && filters.limit > 0 && filters.limit <= 100 ? filters.limit : 50;
    query += ` LIMIT $${paramCount++}`;
    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows.map((row) => this.mapRowToProviderWithDetails(row));
  }

  /**
   * Update provider profile
   */
  static async update(
    id: string,
    data: {
      name?: string;
      photo?: string;
      serviceCategoryId?: string;
      priceRangeMin?: number;
      priceRangeMax?: number;
      yearsOfExperience?: number;
      latitude?: number;
      longitude?: number;
      address?: string;
    }
  ): Promise<Provider | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.photo !== undefined) {
      updates.push(`photo = $${paramCount++}`);
      values.push(data.photo);
    }
    if (data.serviceCategoryId) {
      updates.push(`service_category_id = $${paramCount++}`);
      values.push(data.serviceCategoryId);
    }
    if (data.priceRangeMin !== undefined) {
      updates.push(`price_range_min = $${paramCount++}`);
      values.push(data.priceRangeMin);
    }
    if (data.priceRangeMax !== undefined) {
      updates.push(`price_range_max = $${paramCount++}`);
      values.push(data.priceRangeMax);
    }
    if (data.yearsOfExperience !== undefined) {
      updates.push(`years_of_experience = $${paramCount++}`);
      values.push(data.yearsOfExperience);
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

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE providers
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToProvider(result.rows[0]);
  }

  /**
   * Update provider availability
   */
  static async updateAvailability(
    id: string,
    availability: ProviderAvailability
  ): Promise<Provider | null> {
    const result = await pool.query(
      `UPDATE providers
       SET availability = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [availability, id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToProvider(result.rows[0]);
  }

  /**
   * Update verification status (Admin only)
   */
  static async updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    isVerified: boolean
  ): Promise<Provider | null> {
    const result = await pool.query(
      `UPDATE providers
       SET verification_status = $1, is_verified = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, isVerified, id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToProvider(result.rows[0]);
  }

  /**
   * Delete provider
   */
  static async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM providers WHERE id = $1', [
      id,
    ]);

    return (result.rowCount || 0) > 0;
  }

  private static mapRowToProvider(row: any): Provider {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      photo: row.photo,
      serviceCategoryId: row.service_category_id,
      priceRangeMin: row.price_range_min
        ? parseFloat(row.price_range_min)
        : undefined,
      priceRangeMax: row.price_range_max
        ? parseFloat(row.price_range_max)
        : undefined,
      yearsOfExperience: row.years_of_experience,
      availability: row.availability as ProviderAvailability,
      verificationStatus: row.verification_status as VerificationStatus,
      isVerified: row.is_verified,
      location:
        row.latitude && row.longitude
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

  private static mapRowToProviderWithDetails(row: any): ProviderWithCategory {
    const provider = this.mapRowToProvider(row);
    return {
      ...provider,
      categoryName: row.category_name,
      averageRating: row.average_rating
        ? parseFloat(row.average_rating)
        : 0,
      totalReviews: parseInt(row.total_reviews) || 0,
      portfolioCount: parseInt(row.portfolio_count) || 0,
    };
  }
}
