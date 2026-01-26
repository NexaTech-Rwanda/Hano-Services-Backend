import pool from '../config/database';
import { ServiceCategory } from '../types';

export class ServiceCategoryModel {
  /**
   * Get all service categories
   */
  static async findAll(): Promise<ServiceCategory[]> {
    const result = await pool.query(
      'SELECT * FROM service_categories ORDER BY name ASC'
    );

    return result.rows.map((row) => this.mapRowToCategory(row));
  }

  /**
   * Find category by ID
   */
  static async findById(id: string): Promise<ServiceCategory | null> {
    const result = await pool.query(
      'SELECT * FROM service_categories WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCategory(result.rows[0]);
  }

  /**
   * Create a new category (Admin only)
   */
  static async create(
    name: string,
    description?: string,
    icon?: string
  ): Promise<ServiceCategory> {
    const result = await pool.query(
      `INSERT INTO service_categories (name, description, icon)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description || null, icon || null]
    );

    return this.mapRowToCategory(result.rows[0]);
  }

  /**
   * Update category (Admin only)
   */
  static async update(
    id: string,
    name?: string,
    description?: string,
    icon?: string
  ): Promise<ServiceCategory | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramCount++}`);
      values.push(icon);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE service_categories
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCategory(result.rows[0]);
  }

  /**
   * Delete category (Admin only)
   */
  static async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM service_categories WHERE id = $1',
      [id]
    );

    return (result.rowCount || 0) > 0;
  }

  private static mapRowToCategory(row: any): ServiceCategory {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
