import pool from '../config/database';
import { User, UserRole } from '../types';
import { hashPassword, comparePassword } from '../utils/password';

export class UserModel {
  /**
   * Create a new user
   */
  static async create(
    phone: string,
    role: UserRole,
    email?: string,
    password?: string
  ): Promise<User> {
    const hashedPassword = password ? await hashPassword(password) : null;

    const result = await pool.query(
      `INSERT INTO users (phone, email, password, role, is_phone_verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [phone, email || null, hashedPassword, role, false]
    );

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
   * Update password
   */
  static async updatePassword(id: string, password: string): Promise<void> {
    const hashedPassword = await hashPassword(password);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [
      hashedPassword,
      id,
    ]);
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
      phone: row.phone,
      email: row.email,
      password: row.password,
      role: row.role as UserRole,
      isPhoneVerified: row.is_phone_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
