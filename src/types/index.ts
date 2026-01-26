export enum UserRole {
  CUSTOMER = 'customer',
  PROVIDER = 'provider',
  ADMIN = 'admin',
}

export enum ProviderAvailability {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

export enum BookingStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface User {
  id: string;
  phone: string;
  email?: string;
  password?: string;
  role: UserRole;
  isPhoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Provider {
  id: string;
  userId: string;
  name: string;
  photo?: string;
  serviceCategoryId: string;
  priceRangeMin?: number;
  priceRangeMax?: number;
  yearsOfExperience?: number;
  availability: ProviderAvailability;
  verificationStatus: VerificationStatus;
  isVerified: boolean;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  customerId: string;
  providerId: string;
  serviceCategoryId: string;
  status: BookingStatus;
  scheduledDate?: Date;
  description?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  providerId: string;
  rating: number;
  comment?: string;
  proofImages?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationRequest {
  id: string;
  providerId: string;
  idDocument?: string;
  certificates?: string[];
  references?: string[];
  status: VerificationStatus;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
