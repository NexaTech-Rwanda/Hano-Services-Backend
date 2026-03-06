import pool from '../config/database';
import { UserRole, BookingStatus, VerificationStatus } from '../types';
import { decodeCursor, getNextCursor } from '../utils/pagination';

export class AdminService {
  /**
   * Dashboard summary stats
   */
  static async getDashboardSummary() {
    const [
      totalUsersRes,
      customersRes,
      providersRes,
      adminsRes,
      totalProvidersRes,
      verifiedProvidersRes,
      totalBookingsRes,
      bookingsByStatusRes,
      totalReviewsRes,
      avgRatingRes,
      verificationsByStatusRes,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM users'),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'customer'"),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'provider'"),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'"),
      pool.query('SELECT COUNT(*)::int AS count FROM providers'),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM providers WHERE is_verified = TRUE"
      ),
      pool.query('SELECT COUNT(*)::int AS count FROM bookings'),
      pool.query(
        'SELECT status, COUNT(*)::int AS count FROM bookings GROUP BY status'
      ),
      pool.query('SELECT COUNT(*)::int AS count FROM reviews'),
      pool.query('SELECT COALESCE(AVG(rating), 0) AS avg_rating FROM reviews'),
      pool.query(
        'SELECT status, COUNT(*)::int AS count FROM verification_requests GROUP BY status'
      ),
    ]);

    const bookingsByStatus: Record<BookingStatus, number> = {
      [BookingStatus.PENDING]: 0,
      [BookingStatus.ACCEPTED]: 0,
      [BookingStatus.DECLINED]: 0,
      [BookingStatus.COMPLETED]: 0,
      [BookingStatus.CANCELLED]: 0,
    };
    bookingsByStatusRes.rows.forEach((row) => {
      const status = row.status as BookingStatus;
      bookingsByStatus[status] = row.count;
    });

    const verificationsByStatus: Record<VerificationStatus, number> = {
      [VerificationStatus.PENDING]: 0,
      [VerificationStatus.APPROVED]: 0,
      [VerificationStatus.REJECTED]: 0,
    };
    verificationsByStatusRes.rows.forEach((row) => {
      const status = row.status as VerificationStatus;
      verificationsByStatus[status] = row.count;
    });

    return {
      users: {
        total: totalUsersRes.rows[0].count as number,
        customers: customersRes.rows[0].count as number,
        providers: providersRes.rows[0].count as number,
        admins: adminsRes.rows[0].count as number,
      },
      providers: {
        total: totalProvidersRes.rows[0].count as number,
        verified: verifiedProvidersRes.rows[0].count as number,
      },
      bookings: {
        total: totalBookingsRes.rows[0].count as number,
        byStatus: bookingsByStatus,
      },
      reviews: {
        total: totalReviewsRes.rows[0].count as number,
        averageRating: parseFloat(avgRatingRes.rows[0].avg_rating),
      },
      verifications: {
        byStatus: verificationsByStatus,
      },
    };
  }

  /**
   * List users with filters
   */
  static async listUsers(options: {
    role?: UserRole;
    search?: string;
    limit?: number;
    offset?: number;
    cursor?: string;
  }): Promise<{ items: any[]; nextCursor: string | null }> {
    const { role, search, cursor } = options;
    const limit =
      options.limit && options.limit > 0 && options.limit <= 100 ? options.limit : 20;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (role) {
      conditions.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (search) {
      conditions.push(
        `(phone ILIKE $${paramCount} OR email ILIKE $${paramCount})`
      );
      values.push(`%${search}%`);
      paramCount += 1;
    }

    const decoded = decodeCursor(cursor);
    if (decoded) {
      conditions.push(`(created_at, id) < ($${paramCount}, $${paramCount + 1})`);
      values.push(decoded.createdAt, decoded.id);
      paramCount += 2;
    }

    let query = 'SELECT id, phone, email, role, is_phone_verified, created_at, updated_at FROM users';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';
    query += ` LIMIT $${paramCount++}`;
    values.push(limit);

    const result = await pool.query(query, values);
    const items = result.rows;
    const nextCursor = getNextCursor(
      items,
      (row) => row.id as string,
      (row) => row.created_at as Date | string | null | undefined
    );
    return { items, nextCursor };
  }

  /**
   * List providers with filters
   */
  static async listProviders(options: {
    isVerified?: boolean;
    categoryId?: string;
    limit?: number;
    offset?: number;
    cursor?: string;
  }): Promise<{ items: any[]; nextCursor: string | null }> {
    const { isVerified, categoryId, cursor } = options;
    const limit =
      options.limit && options.limit > 0 && options.limit <= 100 ? options.limit : 20;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (typeof isVerified === 'boolean') {
      conditions.push(`p.is_verified = $${paramCount++}`);
      values.push(isVerified);
    }
    if (categoryId) {
      conditions.push(`p.service_category_id = $${paramCount++}`);
      values.push(categoryId);
    }

    const decoded = decodeCursor(cursor);
    if (decoded) {
      conditions.push(`(p.created_at, p.id) < ($${paramCount}, $${paramCount + 1})`);
      values.push(decoded.createdAt, decoded.id);
      paramCount += 2;
    }

    let query = `
      SELECT
        p.*,
        u.phone,
        u.email,
        sc.name AS category_name
      FROM providers p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN service_categories sc ON p.service_category_id = sc.id
    `;
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY p.created_at DESC';
    query += ` LIMIT $${paramCount++}`;
    values.push(limit);

    const result = await pool.query(query, values);
    const items = result.rows;
    const nextCursor = getNextCursor(
      items,
      (row) => row.id as string,
      (row) => row.created_at as Date | string | null | undefined
    );
    return { items, nextCursor };
  }

  /**
   * List bookings with filters
   */
  static async listBookings(options: {
    status?: BookingStatus;
    limit?: number;
    offset?: number;
    cursor?: string;
  }): Promise<{ items: any[]; nextCursor: string | null }> {
    const { status, cursor } = options;
    const limit =
      options.limit && options.limit > 0 && options.limit <= 100 ? options.limit : 20;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`b.status = $${paramCount++}`);
      values.push(status);
    }

    const decoded = decodeCursor(cursor);
    if (decoded) {
      conditions.push(`(b.created_at, b.id) < ($${paramCount}, $${paramCount + 1})`);
      values.push(decoded.createdAt, decoded.id);
      paramCount += 2;
    }

    let query = `
      SELECT
        b.*,
        cu.phone AS customer_phone,
        pr.name AS provider_name,
        pr.id AS provider_id,
        sc.name AS category_name
      FROM bookings b
      JOIN users cu ON b.customer_id = cu.id
      JOIN providers pr ON b.provider_id = pr.id
      LEFT JOIN service_categories sc ON b.service_category_id = sc.id
    `;
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY b.created_at DESC';
    query += ` LIMIT $${paramCount++}`;
    values.push(limit);

    const result = await pool.query(query, values);
    const items = result.rows;
    const nextCursor = getNextCursor(
      items,
      (row) => row.id as string,
      (row) => row.created_at as Date | string | null | undefined
    );
    return { items, nextCursor };
  }
}

