import pool from '../config/database';

export interface UserLocation {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
}

export class UserLocationModel {
  static async create(userId: string, latitude: number, longitude: number): Promise<UserLocation> {
    const result = await pool.query(
      `INSERT INTO user_locations (user_id, latitude, longitude)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, latitude, longitude, created_at`,
      [userId, latitude, longitude]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      createdAt: row.created_at,
    };
  }
}
