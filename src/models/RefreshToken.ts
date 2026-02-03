import crypto from 'crypto';
import pool from '../config/database';

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class RefreshTokenModel {
  static async create(userId: string, token: string, expiresAt: Date): Promise<void> {
    const tokenHash = hashToken(token);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  }

  static async findValid(token: string): Promise<RefreshTokenRecord | null> {
    const tokenHash = hashToken(token);
    const result = await pool.query(
      `SELECT id, user_id, token_hash, expires_at, revoked, created_at
       FROM refresh_tokens
       WHERE token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const record: RefreshTokenRecord = {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      revoked: row.revoked,
      createdAt: row.created_at,
    };

    const now = new Date();
    if (record.revoked || record.expiresAt <= now) {
      return null;
    }

    return record;
  }

  static async revokeById(id: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`,
      [id]
    );
  }

  static async revokeAllForUser(userId: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
      [userId]
    );
  }
}

