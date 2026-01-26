import pool from '../config/database';
import { generateOTP, getOTPExpiry, isOTPExpired } from '../utils/otp';
import { config } from '../config/config';

export interface OTPRecord {
  id: string;
  phone: string;
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

export class OTPModel {
  /**
   * Generate and store OTP for a phone number
   */
  static async create(phone: string): Promise<string> {
    // Invalidate any existing unused OTPs for this phone
    await pool.query(
      'UPDATE otps SET is_used = TRUE WHERE phone = $1 AND is_used = FALSE',
      [phone]
    );

    const code = generateOTP();
    const expiresAt = getOTPExpiry(config.otp.expiryMinutes);

    await pool.query(
      `INSERT INTO otps (phone, code, expires_at)
       VALUES ($1, $2, $3)`,
      [phone, code, expiresAt]
    );

    return code;
  }

  /**
   * Verify OTP
   */
  static async verify(phone: string, code: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT * FROM otps
       WHERE phone = $1 AND code = $2 AND is_used = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [phone, code]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const otpRecord = result.rows[0];

    // Check if expired
    if (isOTPExpired(otpRecord.expires_at)) {
      return false;
    }

    // Mark as used
    await pool.query('UPDATE otps SET is_used = TRUE WHERE id = $1', [
      otpRecord.id,
    ]);

    return true;
  }

  /**
   * Get latest OTP for a phone (for testing/debugging)
   */
  static async getLatest(phone: string): Promise<OTPRecord | null> {
    const result = await pool.query(
      `SELECT * FROM otps
       WHERE phone = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [phone]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOTP(result.rows[0]);
  }

  /**
   * Clean up expired OTPs (can be run as a cron job)
   */
  static async cleanupExpired(): Promise<number> {
    const result = await pool.query(
      'DELETE FROM otps WHERE expires_at < NOW() AND is_used = TRUE'
    );
    return result.rowCount || 0;
  }

  private static mapRowToOTP(row: any): OTPRecord {
    return {
      id: row.id,
      phone: row.phone,
      code: row.code,
      expiresAt: row.expires_at,
      isUsed: row.is_used,
      createdAt: row.created_at,
    };
  }
}
