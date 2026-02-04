import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { config } from '../config/config';
import pool from '../config/database';

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform?: 'ios' | 'android' | 'web';
  createdAt: Date;
}

export class PushNotificationService {
  private static expo = new Expo({
    accessToken: config.expo?.accessToken,
    useFcmV1: false, // Default; set to true if you use FCM v1 for Android
  });

  /**
   * Register/update a push token for a user.
   * Returns the stored token record (or throws if invalid).
   */
  static async registerToken(userId: string, token: string, platform?: 'ios' | 'android' | 'web'): Promise<PushToken> {
    if (!Expo.isExpoPushToken(token)) {
      throw new Error('Invalid Expo push token');
    }

    // Insert or update token for the user
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
   * Unregister/remove a push token for a user.
   */
  static async unregisterToken(userId: string, token: string): Promise<void> {
    await pool.query(
      `DELETE FROM push_tokens WHERE user_id = $1 AND token = $2`,
      [userId, token]
    );
  }

  /**
   * Get all push tokens for a user.
   */
  static async getTokensForUser(userId: string): Promise<PushToken[]> {
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
   * Send a push notification to specific users.
   * Returns per-ticket results (you can inspect for errors).
   */
  static async sendToUsers(
    userIds: string[],
    payload: {
      title: string;
      body: string;
      data?: Record<string, any>;
      sound?: 'default' | 'default_critical' | null;
      priority?: 'default' | 'high' | 'normal';
      ttl?: number; // seconds
      expiration?: number; // epoch seconds
    }
  ): Promise<ExpoPushTicket[]> {
    // Resolve tokens for the given user IDs
    const tokensResult = await pool.query(
      `SELECT token FROM push_tokens WHERE user_id = ANY($1)`,
      [userIds]
    );

    const tokens = tokensResult.rows.map((r) => r.token);
    if (tokens.length === 0) {
      return []; // Nothing to send
    }

    // Build Expo messages
    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      sound: payload.sound ?? 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      priority: payload.priority ?? 'default',
      ttl: payload.ttl,
      expiration: payload.expiration,
    }));

    // Split into chunks (Expo limit)
    const chunks = PushNotificationService.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await PushNotificationService.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error: any) {
        console.error('Error sending push notification chunk:', error);
        // Optionally collect a synthetic error ticket
        tickets.push(...chunk.map((msg) => ({
          status: 'error' as const,
          message: 'Failed to send chunk',
          details: error.message,
        })));
      }
    }

    // Optionally handle receipts later (not implemented here)
    return tickets;
  }

  /**
   * Helper: send to a single user by ID.
   */
  static async sendToUser(
    userId: string,
    payload: Parameters<typeof PushNotificationService.sendToUsers>[1]
  ): Promise<ExpoPushTicket[]> {
    return PushNotificationService.sendToUsers([userId], payload);
  }

  /**
   * Helper: broadcast to many users (e.g., all providers or customers).
   */
  static async broadcast(
    userIds: string[],
    payload: Parameters<typeof PushNotificationService.sendToUsers>[1]
  ): Promise<ExpoPushTicket[]> {
    return PushNotificationService.sendToUsers(userIds, payload);
  }
}
