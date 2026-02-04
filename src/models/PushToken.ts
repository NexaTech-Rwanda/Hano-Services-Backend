import pool from '../config/database';

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform?: 'ios' | 'android' | 'web';
  createdAt: Date;
}

export class PushTokenModel {
  /**
   * Create or update a push token for a user.
   */
  static async upsert(userId: string, token: string, platform?: 'ios' | 'android' | 'web'): Promise<PushToken> {
    const result = await pool.query(
      `INSERT INTO push_tokens (user_id, token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, token) DO UPDATE SET
         platform = EXCLUDED.platform,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, user_id, token, platform, created_at`,
      [userId, token, platform]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      platform: row.platform,
      createdAt: row.created_at,
    };
  }

  /**
   * Delete a specific push token for a user.
   */
  static async delete(userId: string, token: string): Promise<void> {
    await pool.query(
      `DELETE FROM push_tokens WHERE user_id = $1 AND token = $2`,
      [userId, token]
    );
  }

  /**
   * Get all push tokens for a user.
   */
  static async findByUserId(userId: string): Promise<PushToken[]> {
    const result = await pool.query(
      `SELECT id, user_id, token, platform, created_at
       FROM push_tokens
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      token: row.token,
      platform: row.platform,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get all push tokens for multiple users.
   */
  static async findByUserIds(userIds: string[]): Promise<PushToken[]> {
    const result = await pool.query(
      `SELECT id, user_id, token, platform, created_at
       FROM push_tokens
       WHERE user_id = ANY($1)`,
      [userIds]
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      token: row.token,
      platform: row.platform,
      createdAt: row.created_at,
    }));
  }
}
