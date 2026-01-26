import pool from '../config/database';

export interface ProviderPortfolio {
  id: string;
  providerId: string;
  imageUrl: string;
  description?: string;
  createdAt: Date;
}

export class ProviderPortfolioModel {
  /**
   * Add portfolio image
   */
  static async create(
    providerId: string,
    imageUrl: string,
    description?: string
  ): Promise<ProviderPortfolio> {
    const result = await pool.query(
      `INSERT INTO provider_portfolios (provider_id, image_url, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [providerId, imageUrl, description || null]
    );

    return this.mapRowToPortfolio(result.rows[0]);
  }

  /**
   * Get all portfolio images for a provider
   */
  static async findByProviderId(
    providerId: string
  ): Promise<ProviderPortfolio[]> {
    const result = await pool.query(
      `SELECT * FROM provider_portfolios
       WHERE provider_id = $1
       ORDER BY created_at DESC`,
      [providerId]
    );

    return result.rows.map((row) => this.mapRowToPortfolio(row));
  }

  /**
   * Get portfolio by ID
   */
  static async findById(id: string): Promise<ProviderPortfolio | null> {
    const result = await pool.query(
      'SELECT * FROM provider_portfolios WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPortfolio(result.rows[0]);
  }

  /**
   * Update portfolio image
   */
  static async update(
    id: string,
    imageUrl?: string,
    description?: string
  ): Promise<ProviderPortfolio | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (imageUrl !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(imageUrl);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE provider_portfolios
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPortfolio(result.rows[0]);
  }

  /**
   * Delete portfolio image
   */
  static async delete(id: string, providerId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM provider_portfolios WHERE id = $1 AND provider_id = $2',
      [id, providerId]
    );

    return (result.rowCount || 0) > 0;
  }

  private static mapRowToPortfolio(row: any): ProviderPortfolio {
    return {
      id: row.id,
      providerId: row.provider_id,
      imageUrl: row.image_url,
      description: row.description,
      createdAt: row.created_at,
    };
  }
}
