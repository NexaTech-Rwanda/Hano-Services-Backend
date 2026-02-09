import pool from '../config/database';
import { User, UserRole } from '../types';
import { hashPassword, comparePassword } from '../utils/password';

export class UserModel {
  /**
   * Create a new user
   */
  static async create(
    username: string,
    phone: string,
    role: UserRole,
    email?: string,
    password?: string
  ): Promise<User> {
    const hashedPassword = password ? await hashPassword(password) : null;

    const result = await pool.query(
      `INSERT INTO users (username, phone, email, password, role, is_phone_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [username, phone, email || null, hashedPassword, role, false]
    );

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Find user by username
   */
  static async findByUsername(username: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [
      username,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Find user by phone
   */
  static async findByPhone(phone: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE phone = $1', [
      phone,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Verify phone number
   */
  static async verifyPhone(id: string): Promise<void> {
    await pool.query('UPDATE users SET is_phone_verified = TRUE WHERE id = $1', [
      id,
    ]);
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    id: string,
    data: {
      username?: string;
      email?: string;
      phone?: string;
      photo?: string;
    }
  ): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(data.username);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(data.phone);
    }
    if (data.photo !== undefined) {
      updates.push(`photo = $${paramCount++}`);
      values.push(data.photo);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows.length ? this.mapRowToUser(result.rows[0]) : null;
  }

  /**
   * Update user password
   */
  static async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      hashedPassword,
      id,
    ]);
  }

  /**
   * Update preferred contact method
   */
  static async updatePreferredContactMethod(id: string, preferredContactMethod: string): Promise<User | null> {
    const result = await pool.query(
      'UPDATE users SET preferred_contact_method = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [preferredContactMethod, id]
    );

    return result.rows.length ? this.mapRowToUser(result.rows[0]) : null;
  }

  /**
   * Verify password
   */
  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return comparePassword(password, hash);
  }

  /**
   * Map database row to User object
   */
  private static mapRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      phone: row.phone,
      email: row.email,
      password: row.password,
      role: row.role as UserRole,
      isPhoneVerified: row.is_phone_verified,
      photo: row.photo,
      preferredContactMethod: row.preferred_contact_method,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
