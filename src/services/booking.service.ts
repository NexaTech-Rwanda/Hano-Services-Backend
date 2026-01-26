import { BookingModel } from '../models/Booking';
import { BookingStatus, UserRole } from '../types';
import { ProviderModel } from '../models/Provider';

export class BookingService {
  /**
   * Create a booking (customer -> provider)
   */
  static async createBooking(
    customerId: string,
    providerId: string,
    serviceCategoryId: string,
    data: {
      scheduledDate?: Date;
      description?: string;
      latitude?: number;
      longitude?: number;
      address?: string;
    }
  ) {
    const provider = await ProviderModel.findById(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    if (provider.serviceCategoryId !== serviceCategoryId) {
      throw new Error('Provider does not offer this service category');
    }

    return BookingModel.create(customerId, providerId, serviceCategoryId, data);
  }

  /**
   * Get booking by ID with basic access control
   */
  static async getBooking(
    bookingId: string,
    userId: string,
    role: UserRole
  ) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (role === UserRole.CUSTOMER && booking.customerId !== userId) {
      throw new Error('Unauthorized to view this booking');
    }
    if (role === UserRole.PROVIDER && booking.providerId !== userId) {
      throw new Error('Unauthorized to view this booking');
    }

    return booking;
  }

  /**
   * List bookings for current user
   */
  static async listBookingsForUser(userId: string, role: UserRole) {
    if (role === UserRole.CUSTOMER) {
      return BookingModel.findByCustomerId(userId);
    }
    if (role === UserRole.PROVIDER) {
      return BookingModel.findByProviderId(userId);
    }

    throw new Error('Listing bookings for this role is not supported yet');
  }

  /**
   * Customer can update/cancel their booking
   */
  static async updateBookingByCustomer(
    bookingId: string,
    customerId: string,
    data: {
      scheduledDate?: Date | null;
      description?: string;
      latitude?: number | null;
      longitude?: number | null;
      address?: string | null;
      cancel?: boolean;
    }
  ) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    if (booking.customerId !== customerId) {
      throw new Error('You can only update your own bookings');
    }

    const updateData: {
      scheduledDate?: Date | null;
      description?: string;
      latitude?: number | null;
      longitude?: number | null;
      address?: string | null;
      status?: BookingStatus;
    } = {};

    if (data.scheduledDate !== undefined) updateData.scheduledDate = data.scheduledDate;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.address !== undefined) updateData.address = data.address;

    if (data.cancel) {
      updateData.status = BookingStatus.CANCELLED;
    }

    return BookingModel.update(bookingId, updateData);
  }

  /**
   * Provider accepts/declines/completes booking
   */
  static async updateBookingStatusByProvider(
    bookingId: string,
    providerId: string,
    status: BookingStatus
  ) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    if (booking.providerId !== providerId) {
      throw new Error('You can only update your own bookings');
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new Error('Cannot change a completed or cancelled booking');
    }

    return BookingModel.update(bookingId, { status });
  }
}

