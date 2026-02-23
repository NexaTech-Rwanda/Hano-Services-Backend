/**
 * Booking Service Unit Tests
 * SRS Coverage: FR14 (Book appointment), FR15 (Accept/Decline),
 *               FR16 (Status notifications)
 */

import { BookingService } from '../../services/booking.service';
import { BookingModel } from '../../models/BookingModel';
import { ProviderModel } from '../../models/Provider';
import { StorageService } from '../../services/storage.service';
import { BookingStatus, UserRole } from '../../types';

jest.mock('../../models/BookingModel');
jest.mock('../../models/Provider');
jest.mock('../../services/storage.service');

const mockProvider = {
  id: 'provider-uuid-1',
  userId: 'user-uuid-2',
  name: 'Test Provider',
  serviceCategoryId: 'cat-uuid-1',
  availability: 'available',
};

const mockBooking = {
  id: 'booking-uuid-1',
  customerId: 'user-uuid-1',
  providerId: 'provider-uuid-1',
  serviceCategoryId: 'cat-uuid-1',
  status: BookingStatus.PENDING,
  scheduledDate: new Date('2026-03-01'),
  description: 'Fix the plumbing',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── FR14: Create Booking ────────────────────────────────────────
  describe('createBooking', () => {
    it('should create a booking successfully', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);
      (BookingModel.create as jest.Mock).mockResolvedValue(mockBooking);

      const result = await BookingService.createBooking(
        'user-uuid-1',
        'provider-uuid-1',
        'cat-uuid-1',
        { scheduledDate: new Date('2026-03-01'), description: 'Fix the plumbing' }
      );

      expect(result).toEqual(mockBooking);
      expect(BookingModel.create).toHaveBeenCalled();
    });

    it('should throw error if provider not found', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        BookingService.createBooking('user-uuid-1', 'nonexistent', 'cat-uuid-1', {})
      ).rejects.toThrow('Provider not found');
    });

    it('should throw error if provider does not offer the category', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue({
        ...mockProvider,
        serviceCategoryId: 'different-cat',
      });

      await expect(
        BookingService.createBooking('user-uuid-1', 'provider-uuid-1', 'cat-uuid-1', {})
      ).rejects.toThrow('Provider does not offer this service category');
    });

    it('should upload image when provided', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);
      (StorageService.uploadImage as jest.Mock).mockResolvedValue({
        url: 'https://storage.example.com/bookings/image.jpg',
      });
      (BookingModel.create as jest.Mock).mockResolvedValue({
        ...mockBooking,
        imageUrl: 'https://storage.example.com/bookings/image.jpg',
      });

      const imageFile = {
        mimetype: 'image/jpeg',
        originalname: 'photo.jpg',
        buffer: Buffer.from('fake-image'),
      } as Express.Multer.File;

      const result = await BookingService.createBooking(
        'user-uuid-1',
        'provider-uuid-1',
        'cat-uuid-1',
        {},
        imageFile
      );

      expect(StorageService.uploadImage).toHaveBeenCalled();
      expect(result.imageUrl).toBeDefined();
    });

    it('should reject non-image files', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);

      const badFile = {
        mimetype: 'application/pdf',
        originalname: 'document.pdf',
        buffer: Buffer.from('fake-pdf'),
      } as Express.Multer.File;

      await expect(
        BookingService.createBooking('user-uuid-1', 'provider-uuid-1', 'cat-uuid-1', {}, badFile)
      ).rejects.toThrow('Only JPEG, JPG, and PNG images are allowed');
    });
  });

  // ─── Get Booking with access control ─────────────────────────────
  describe('getBooking', () => {
    it('should return booking for the customer who created it', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);

      const result = await BookingService.getBooking(
        'booking-uuid-1',
        'user-uuid-1',
        UserRole.CUSTOMER
      );

      expect(result).toEqual(mockBooking);
    });

    it('should throw error if booking not found', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        BookingService.getBooking('nonexistent', 'user-uuid-1', UserRole.CUSTOMER)
      ).rejects.toThrow('Booking not found');
    });

    it('should deny access to unrelated customer', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);

      await expect(
        BookingService.getBooking('booking-uuid-1', 'other-user', UserRole.CUSTOMER)
      ).rejects.toThrow('Unauthorized to view this booking');
    });

    it('should deny access to unrelated provider', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);

      await expect(
        BookingService.getBooking('booking-uuid-1', 'other-provider', UserRole.PROVIDER)
      ).rejects.toThrow('Unauthorized to view this booking');
    });
  });

  // ─── List bookings ───────────────────────────────────────────────
  describe('listBookingsForUser', () => {
    it('should list bookings for customer', async () => {
      (BookingModel.findByCustomerId as jest.Mock).mockResolvedValue([mockBooking]);

      const result = await BookingService.listBookingsForUser('user-uuid-1', UserRole.CUSTOMER);

      expect(result).toHaveLength(1);
      expect(BookingModel.findByCustomerId).toHaveBeenCalledWith('user-uuid-1');
    });

    it('should list bookings for provider', async () => {
      (BookingModel.findByProviderId as jest.Mock).mockResolvedValue([mockBooking]);

      const result = await BookingService.listBookingsForUser('provider-uuid-1', UserRole.PROVIDER);

      expect(result).toHaveLength(1);
    });

    it('should throw error for admin role', async () => {
      await expect(
        BookingService.listBookingsForUser('admin-uuid', UserRole.ADMIN)
      ).rejects.toThrow('Listing bookings for this role is not supported yet');
    });
  });

  // ─── Customer Update/Cancel ──────────────────────────────────────
  describe('updateBookingByCustomer', () => {
    it('should allow customer to cancel their booking', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);
      (BookingModel.update as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      });

      const result = await BookingService.updateBookingByCustomer(
        'booking-uuid-1',
        'user-uuid-1',
        { cancel: true }
      );

      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('should throw error if booking not found', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        BookingService.updateBookingByCustomer('nonexistent', 'user-uuid-1', {})
      ).rejects.toThrow('Booking not found');
    });

    it('should throw error if customer tries to update another\'s booking', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);

      await expect(
        BookingService.updateBookingByCustomer('booking-uuid-1', 'other-user', {})
      ).rejects.toThrow('You can only update your own bookings');
    });
  });

  // ─── FR15: Provider Accept/Decline ───────────────────────────────
  describe('updateBookingStatusByProvider', () => {
    it('should allow provider to accept a pending booking', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);
      (BookingModel.update as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.ACCEPTED,
      });

      const result = await BookingService.updateBookingStatusByProvider(
        'booking-uuid-1',
        'provider-uuid-1',
        BookingStatus.ACCEPTED
      );

      expect(result.status).toBe(BookingStatus.ACCEPTED);
    });

    it('should allow provider to decline a pending booking', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);
      (BookingModel.update as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.DECLINED,
      });

      const result = await BookingService.updateBookingStatusByProvider(
        'booking-uuid-1',
        'provider-uuid-1',
        BookingStatus.DECLINED
      );

      expect(result.status).toBe(BookingStatus.DECLINED);
    });

    it('should throw error if provider is not the assigned provider', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);

      await expect(
        BookingService.updateBookingStatusByProvider(
          'booking-uuid-1',
          'wrong-provider',
          BookingStatus.ACCEPTED
        )
      ).rejects.toThrow('You can only update your own bookings');
    });

    it('should not allow changing a completed booking', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.COMPLETED,
      });

      await expect(
        BookingService.updateBookingStatusByProvider(
          'booking-uuid-1',
          'provider-uuid-1',
          BookingStatus.ACCEPTED
        )
      ).rejects.toThrow('Cannot change a completed or cancelled booking');
    });

    it('should not allow changing a cancelled booking', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      });

      await expect(
        BookingService.updateBookingStatusByProvider(
          'booking-uuid-1',
          'provider-uuid-1',
          BookingStatus.ACCEPTED
        )
      ).rejects.toThrow('Cannot change a completed or cancelled booking');
    });
  });
});
