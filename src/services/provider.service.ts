import { ProviderModel, ProviderWithCategory } from '../models/Provider';
import { ProviderPortfolioModel } from '../models/ProviderPortfolio';
import { VerificationRequestModel } from '../models/VerificationRequest';
import {
  ProviderAvailability,
  VerificationStatus,
} from '../types';
import { UserModel } from '../models/User';

export class ProviderService {
  /**
   * Create provider profile
   */
  static async createProfile(
    userId: string,
    name: string,
    serviceCategoryId: string,
    data: {
      photo?: string;
      priceRangeMin?: number;
      priceRangeMax?: number;
      yearsOfExperience?: number;
      latitude?: number;
      longitude?: number;
      address?: string;
      bio?: string;
      certifications?: string[];
      languages?: string[];
      availabilityHours?: Record<string, { open: string; close: string }>;
      responseRate?: number;
      responseTimeMinutes?: number;
      website?: string;
      socialLinks?: Record<string, string>;
      preferredContactMethod?: 'phone' | 'email' | 'whatsapp' | 'sms';
      isFeatured?: boolean;
      featuredUntil?: Date;
    }
  ) {
    // Check if user exists and is a provider
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.role !== 'provider') {
      throw new Error('User is not a provider');
    }

    // Check if provider profile already exists
    const existingProvider = await ProviderModel.findByUserId(userId);
    if (existingProvider) {
      throw new Error('Provider profile already exists');
    }

    return await ProviderModel.create(userId, name, serviceCategoryId, data);
  }

  /**
   * Get provider profile
   */
  static async getProfile(providerId: string) {
    const provider = await ProviderModel.findByIdWithDetails(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }
    return provider;
  }

  /**
   * Get provider profile by user ID
   */
  static async getProfileByUserId(userId: string) {
    const provider = await ProviderModel.findByUserId(userId);
    if (!provider) {
      throw new Error('Provider profile not found');
    }
    return await ProviderModel.findByIdWithDetails(provider.id);
  }

  /**
   * Update provider profile
   */
  static async updateProfile(
    providerId: string,
    userId: string,
    data: {
      name?: string;
      photo?: string;
      serviceCategoryId?: string;
      priceRangeMin?: number;
      priceRangeMax?: number;
      yearsOfExperience?: number;
      latitude?: number;
      longitude?: number;
      address?: string;
      bio?: string;
      certifications?: string[];
      languages?: string[];
      availabilityHours?: Record<string, { open: string; close: string }>;
      responseRate?: number;
      responseTimeMinutes?: number;
      website?: string;
      socialLinks?: Record<string, string>;
      preferredContactMethod?: 'phone' | 'email' | 'whatsapp' | 'sms';
      isFeatured?: boolean;
      featuredUntil?: Date;
    }
  ) {
    // Verify ownership
    const provider = await ProviderModel.findById(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }
    if (provider.userId !== userId) {
      throw new Error('Unauthorized: You can only update your own profile');
    }

    return await ProviderModel.update(providerId, data);
  }

  /**
   * Update availability
   */
  static async updateAvailability(
    providerId: string,
    userId: string,
    availability: ProviderAvailability
  ) {
    // Verify ownership
    const provider = await ProviderModel.findById(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }
    if (provider.userId !== userId) {
      throw new Error('Unauthorized: You can only update your own availability');
    }

    return await ProviderModel.updateAvailability(providerId, availability);
  }

  /**
   * Search providers
   */
  static async searchProviders(filters: {
    serviceCategoryId?: string;
    latitude?: number;
    longitude?: number;
    maxDistance?: number;
    minRating?: number;
    minPrice?: number;
    maxPrice?: number;
    availability?: ProviderAvailability;
    isVerified?: boolean;
    limit?: number;
    offset?: number;
    cursor?: string;
  }): Promise<ProviderWithCategory[]> {
    return await ProviderModel.search(filters);
  }

  /**
   * Add portfolio image
   */
  static async addPortfolioImage(
    providerId: string,
    userId: string,
    imageUrl: string,
    description?: string
  ) {
    // Verify ownership
    const provider = await ProviderModel.findById(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }
    if (provider.userId !== userId) {
      throw new Error('Unauthorized: You can only add to your own portfolio');
    }

    return await ProviderPortfolioModel.create(providerId, imageUrl, description);
  }

  /**
   * Get portfolio images
   */
  static async getPortfolio(providerId: string) {
    return await ProviderPortfolioModel.findByProviderId(providerId);
  }

  /**
   * Delete portfolio image
   */
  static async deletePortfolioImage(
    portfolioId: string,
    providerId: string,
    userId: string
  ) {
    // Verify ownership
    const provider = await ProviderModel.findById(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }
    if (provider.userId !== userId) {
      throw new Error('Unauthorized: You can only delete your own portfolio images');
    }

    const deleted = await ProviderPortfolioModel.delete(portfolioId, providerId);
    if (!deleted) {
      throw new Error('Portfolio image not found');
    }
    return { success: true };
  }

  /**
   * Submit verification request
   */
  static async submitVerification(
    providerId: string,
    userId: string,
    data: {
      idDocument?: string;
      certificates?: string[];
      references?: string[];
    }
  ) {
    // Verify ownership
    const provider = await ProviderModel.findById(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }
    if (provider.userId !== userId) {
      throw new Error('Unauthorized: You can only submit verification for your own profile');
    }

    // Check if there's already a pending request
    const existingRequest = await VerificationRequestModel.findByProviderId(providerId);
    if (existingRequest && existingRequest.status === 'pending') {
      throw new Error('You already have a pending verification request');
    }

    // Create verification request
    const request = await VerificationRequestModel.create(providerId, data);

    // Update provider verification status to pending
    await ProviderModel.updateVerificationStatus(
      providerId,
      VerificationStatus.PENDING,
      false
    );

    return request;
  }

  /**
   * Get verification request
   */
  static async getVerificationRequest(providerId: string, userId: string) {
    // Verify ownership
    const provider = await ProviderModel.findById(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }
    if (provider.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return await VerificationRequestModel.findByProviderId(providerId);
  }
}
