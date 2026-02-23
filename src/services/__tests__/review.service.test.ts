/**
 * Review Service Unit Tests
 * SRS Coverage: FR17 (Rate provider after service), FR18 (Upload proof images),
 *               FR19 (Admin remove inappropriate reviews)
 */

import { ReviewService } from '../../services/review.service';
import { ReviewModel } from '../../models/Review';
import { BookingModel } from '../../models/Booking';
import { BookingStatus, UserRole } from '../../types';

jest.mock('../../models/Review');
jest.mock('../../models/Booking');

const mockBooking = {
  id: 'booking-uuid-1',
  customerId: 'customer-uuid-1',
  providerId: 'provider-uuid-1',
  serviceCategoryId: 'cat-uuid-1',
  status: BookingStatus.COMPLETED,
};

const mockReview = {
  id: 'review-uuid-1',
  bookingId: 'booking-uuid-1',
  customerId: 'customer-uuid-1',
  providerId: 'provider-uuid-1',
  rating: 5,
  comment: 'Excellent work!',
  proofImages: ['https://example.com/proof1.jpg'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ReviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── FR17: Create Review ─────────────────────────────────────────
  describe('createReview', () => {
    it('should create a review for a completed booking', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);
      (ReviewModel.findByBookingId as jest.Mock).mockResolvedValue(null);
      (ReviewModel.create as jest.Mock).mockResolvedValue(mockReview);

      const result = await ReviewService.createReview(
        'booking-uuid-1',
        'customer-uuid-1',
        { rating: 5, comment: 'Excellent work!', proofImages: ['https://example.com/proof1.jpg'] }
      );

      expect(result).toEqual(mockReview);
      expect(ReviewModel.create).toHaveBeenCalledWith(
        'booking-uuid-1',
        'customer-uuid-1',
        'provider-uuid-1',
        5,
        'Excellent work!',
        ['https://example.com/proof1.jpg']
      );
    });

    it('should throw error if booking not found', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ReviewService.createReview('nonexistent', 'customer-uuid-1', { rating: 5 })
      ).rejects.toThrow('Booking not found');
    });

    it('should throw error if customer is not the booking customer', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);

      await expect(
        ReviewService.createReview('booking-uuid-1', 'other-customer', { rating: 5 })
      ).rejects.toThrow('You can only review your own bookings');
    });

    it('should throw error if booking is not completed', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.PENDING,
      });

      await expect(
        ReviewService.createReview('booking-uuid-1', 'customer-uuid-1', { rating: 5 })
      ).rejects.toThrow('You can only review completed bookings');
    });

    it('should throw error if booking already reviewed', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);
      (ReviewModel.findByBookingId as jest.Mock).mockResolvedValue(mockReview);

      await expect(
        ReviewService.createReview('booking-uuid-1', 'customer-uuid-1', { rating: 4 })
      ).rejects.toThrow('This booking has already been reviewed');
    });

    it('should throw error for invalid rating (too low)', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);
      (ReviewModel.findByBookingId as jest.Mock).mockResolvedValue(null);

      await expect(
        ReviewService.createReview('booking-uuid-1', 'customer-uuid-1', { rating: 0 })
      ).rejects.toThrow('Rating must be between 1 and 5');
    });

    it('should throw error for invalid rating (too high)', async () => {
      (BookingModel.findById as jest.Mock).mockResolvedValue(mockBooking);
      (ReviewModel.findByBookingId as jest.Mock).mockResolvedValue(null);

      await expect(
        ReviewService.createReview('booking-uuid-1', 'customer-uuid-1', { rating: 6 })
      ).rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  // ─── List provider reviews ───────────────────────────────────────
  describe('listProviderReviews', () => {
    it('should return paginated reviews for a provider', async () => {
      const reviewsResult = {
        items: [mockReview],
        nextCursor: null,
      };
      (ReviewModel.findByProviderId as jest.Mock).mockResolvedValue(reviewsResult);

      const result = await ReviewService.listProviderReviews('provider-uuid-1', {
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(ReviewModel.findByProviderId).toHaveBeenCalledWith('provider-uuid-1', {
        limit: 10,
      });
    });
  });

  // ─── Get Review with access control ──────────────────────────────
  describe('getReview', () => {
    it('should return review for the customer who wrote it', async () => {
      (ReviewModel.findById as jest.Mock).mockResolvedValue(mockReview);

      const result = await ReviewService.getReview(
        'review-uuid-1',
        'customer-uuid-1',
        UserRole.CUSTOMER
      );

      expect(result).toEqual(mockReview);
    });

    it('should return review for the reviewed provider', async () => {
      (ReviewModel.findById as jest.Mock).mockResolvedValue(mockReview);

      const result = await ReviewService.getReview(
        'review-uuid-1',
        'provider-uuid-1',
        UserRole.PROVIDER
      );

      expect(result).toEqual(mockReview);
    });

    it('should throw error if review not found', async () => {
      (ReviewModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ReviewService.getReview('nonexistent', 'customer-uuid-1', UserRole.CUSTOMER)
      ).rejects.toThrow('Review not found');
    });

    it('should deny access to unrelated customer', async () => {
      (ReviewModel.findById as jest.Mock).mockResolvedValue(mockReview);

      await expect(
        ReviewService.getReview('review-uuid-1', 'other-customer', UserRole.CUSTOMER)
      ).rejects.toThrow('Unauthorized to view this review');
    });

    it('should deny access to unrelated provider', async () => {
      (ReviewModel.findById as jest.Mock).mockResolvedValue(mockReview);

      await expect(
        ReviewService.getReview('review-uuid-1', 'other-provider', UserRole.PROVIDER)
      ).rejects.toThrow('Unauthorized to view this review');
    });
  });

  // ─── FR19: Admin Delete Review ───────────────────────────────────
  describe('deleteReviewByAdmin', () => {
    it('should delete an existing review', async () => {
      (ReviewModel.delete as jest.Mock).mockResolvedValue(true);

      await expect(
        ReviewService.deleteReviewByAdmin('review-uuid-1')
      ).resolves.toBeUndefined();
    });

    it('should throw error if review not found', async () => {
      (ReviewModel.delete as jest.Mock).mockResolvedValue(false);

      await expect(
        ReviewService.deleteReviewByAdmin('nonexistent')
      ).rejects.toThrow('Review not found');
    });
  });
});
