import { BookingModel } from '../models/BookingModel';
import { BookingStatus, UserRole } from '../types';
import { ProviderModel } from '../models/Provider';
import { StorageService } from './storage.service';

export class BookingService {
  /**
   * Create a booking (customer -> provider) with optional image upload
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
      notes?: string;
    },
    imageFile?: Express.Multer.File
  ) {
    const provider = await ProviderModel.findById(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    if (provider.serviceCategoryId !== serviceCategoryId) {
      throw new Error('Provider does not offer this service category');
    }

    let imageUrl: string | undefined;

    // Upload image if provided
    if (imageFile) {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedMimeTypes.includes(imageFile.mimetype)) {
        throw new Error('Only JPEG, JPG, and PNG images are allowed');
      }

      // Generate unique filename
      const fileExt = imageFile.originalname.split('.').pop();
      const fileName = `booking-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const uploadResult = await StorageService.uploadImage({
        path: `bookings/${fileName}`,
        contentType: imageFile.mimetype,
        file: imageFile.buffer,
        bucket: 'bookings',
      });
      imageUrl = uploadResult.url;
    }

    // Create booking with image URL
    return BookingModel.create(customerId, providerId, serviceCategoryId, {
      ...data,
      imageUrl,
    });
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

    // Filter out null values for BookingModel.update
    const filteredUpdateData: {
      scheduledDate?: Date;
      description?: string;
      latitude?: number;
      longitude?: number;
      address?: string;
      status?: BookingStatus;
    } = {};
    if (updateData.scheduledDate !== null && updateData.scheduledDate !== undefined) {
      filteredUpdateData.scheduledDate = updateData.scheduledDate;
    }
    if (updateData.description !== undefined) filteredUpdateData.description = updateData.description;
    if (updateData.latitude !== null && updateData.latitude !== undefined) {
      filteredUpdateData.latitude = updateData.latitude;
    }
    if (updateData.longitude !== null && updateData.longitude !== undefined) {
      filteredUpdateData.longitude = updateData.longitude;
    }
    if (updateData.address !== null && updateData.address !== undefined) {
      filteredUpdateData.address = updateData.address;
    }
    if (updateData.status !== undefined) filteredUpdateData.status = updateData.status;

    return BookingModel.update(bookingId, filteredUpdateData);
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

