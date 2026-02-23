/**
 * Admin Service Unit Tests
 * SRS Coverage: FR26 (Manage users/providers), FR29 (Analytics/Dashboard)
 */

import { AdminService } from '../../services/admin.service';
import pool from '../../config/database';
import { UserRole, BookingStatus } from '../../types';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

const mockedPool = pool as jest.Mocked<typeof pool>;

describe('AdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── FR29: Dashboard Summary ─────────────────────────────────────
  describe('getDashboardSummary', () => {
    it('should aggregate dashboard statistics', async () => {
      // Mock 11 queries expected by getDashboardSummary
      (mockedPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: 150 }] }) // totalUsers
        .mockResolvedValueOnce({ rows: [{ count: 100 }] }) // customers
        .mockResolvedValueOnce({ rows: [{ count: 45 }] })  // providers
        .mockResolvedValueOnce({ rows: [{ count: 5 }] })   // admins
        .mockResolvedValueOnce({ rows: [{ count: 45 }] })  // totalProviders (table)
        .mockResolvedValueOnce({ rows: [{ count: 30 }] })  // verifiedProviders
        .mockResolvedValueOnce({ rows: [{ count: 320 }] }) // totalBookings
        .mockResolvedValueOnce({ rows: [{ status: 'completed', count: 200 }] }) // bookingsByStatus
        .mockResolvedValueOnce({ rows: [{ count: 250 }] }) // totalReviews
        .mockResolvedValueOnce({ rows: [{ avg_rating: '4.5' }] }) // avgRating
        .mockResolvedValueOnce({ rows: [{ status: 'pending', count: 5 }] }); // verificationsByStatus

      const result = await AdminService.getDashboardSummary();

      expect(result.users).toBeDefined();
      expect(result.providers).toBeDefined();
      expect(result.bookings).toBeDefined();
      expect(result.users.total).toBe(150);
      expect(result.providers.total).toBe(45);
      expect(result.bookings.total).toBe(320);
    });
  });

  // ─── FR26: List Users ────────────────────────────────────────────
  describe('listUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        { id: 'u1', username: 'user1', role: UserRole.CUSTOMER, created_at: new Date() },
        { id: 'u2', username: 'user2', role: UserRole.PROVIDER, created_at: new Date() },
      ];
      (mockedPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockUsers });

      const result = await AdminService.listUsers({ limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeDefined();
      expect(mockedPool.query).toHaveBeenCalled();
    });

    it('should apply role filter', async () => {
      (mockedPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'u1', username: 'user1', role: UserRole.CUSTOMER, created_at: new Date() }],
      });

      const result = await AdminService.listUsers({ limit: 10, role: UserRole.CUSTOMER });

      expect(result.items).toHaveLength(1);
      const queryCall = (mockedPool.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('role');
    });

    it('should support cursor-based pagination', async () => {
      (mockedPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'u5', username: 'user5', role: UserRole.CUSTOMER, created_at: new Date() }],
      });

      const result = await AdminService.listUsers({
        limit: 10,
        cursor: 'eyCreatedAtMToiMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaIiwiaWQiOiJ1NCJ9', // Valid base64 encoded cursor
      });

      expect(result.items).toHaveLength(1);
    });
  });

  // ─── FR26: List Providers ────────────────────────────────────────
  describe('listProviders', () => {
    it('should return paginated providers', async () => {
      const mockProviders = [
        { id: 'p1', name: 'Provider 1', isVerified: true, created_at: new Date() },
      ];
      (mockedPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockProviders });

      const result = await AdminService.listProviders({ limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeDefined();
    });

    it('should filter by verification status', async () => {
      (mockedPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await AdminService.listProviders({
        limit: 10,
        isVerified: true,
      });

      const queryCall = (mockedPool.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('is_verified');
    });
  });

  // ─── List Bookings ──────────────────────────────────────────────
  describe('listBookings', () => {
    it('should return paginated bookings', async () => {
      const mockBookings = [
        { id: 'b1', customerId: 'u1', providerId: 'p1', status: BookingStatus.COMPLETED, created_at: new Date() },
      ];
      (mockedPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockBookings });

      const result = await AdminService.listBookings({ limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeDefined();
    });

    it('should filter by status', async () => {
      (mockedPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await AdminService.listBookings({ limit: 10, status: BookingStatus.PENDING });

      const queryCall = (mockedPool.query as jest.Mock).mock.calls[0];
      expect(queryCall[0]).toContain('status');
    });
  });
});
