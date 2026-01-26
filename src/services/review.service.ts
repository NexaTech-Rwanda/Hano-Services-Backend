import { ReviewModel } from '../models/Review';
import { BookingModel } from '../models/Booking';
import { BookingStatus, UserRole } from '../types';

export class ReviewService {
  /**
   * Create a review for a completed booking
   */
  static async createReview(
    bookingId: string,
    customerId: string,
    data: {
      rating: number;
      comment?: string;
      proofImages?: string[];
    }
  ) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.customerId !== customerId) {
      throw new Error('You can only review your own bookings');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new Error('You can only review completed bookings');
    }

    const existing = await ReviewModel.findByBookingId(bookingId);
    if (existing) {
      throw new Error('This booking has already been reviewed');
    }

    if (data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    return ReviewModel.create(
      bookingId,
      booking.customerId,
      booking.providerId,
      data.rating,
      data.comment,
      data.proofImages
    );
  }

  /**
   * List reviews for a provider
   */
  static async listProviderReviews(
    providerId: string,
    limit?: number,
    offset?: number
  ) {
    const safeLimit = limit && limit > 0 && limit <= 100 ? limit : 50;
    const safeOffset = offset && offset >= 0 ? offset : 0;

    return ReviewModel.findByProviderId(providerId, safeLimit, safeOffset);
  }

  /**
   * Get review by ID with basic access control
   */
  static async getReview(
    reviewId: string,
    userId: string,
    role: UserRole
  ) {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    if (role === UserRole.CUSTOMER && review.customerId !== userId) {
      throw new Error('Unauthorized to view this review');
    }
    if (role === UserRole.PROVIDER && review.providerId !== userId) {
      throw new Error('Unauthorized to view this review');
    }

    return review;
  }

  /**
   * Admin delete review
   */
  static async deleteReviewByAdmin(reviewId: string) {
    const deleted = await ReviewModel.delete(reviewId);
    if (!deleted) {
      throw new Error('Review not found');
    }
  }
}

