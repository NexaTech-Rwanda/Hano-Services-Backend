/**
 * Provider Service Unit Tests
 * SRS Coverage: FR8 (Create profile), FR9 (Availability),
 *               FR10-12 (Search/Filters), FR13 (Full profile),
 *               FR23-25 (Verification)
 */

import { ProviderService } from '../../services/provider.service';
import { ProviderModel } from '../../models/Provider';
import { ProviderPortfolioModel } from '../../models/ProviderPortfolio';
import { VerificationRequestModel } from '../../models/VerificationRequest';
import { UserModel } from '../../models/User';
import { ProviderAvailability, VerificationStatus } from '../../types';

jest.mock('../../models/Provider');
jest.mock('../../models/ProviderPortfolio');
jest.mock('../../models/VerificationRequest');
jest.mock('../../models/User');

const mockUser = {
  id: 'user-uuid-1',
  username: 'provideruser',
  phone: '+250780000001',
  role: 'provider',
};

const mockProvider = {
  id: 'provider-uuid-1',
  userId: 'user-uuid-1',
  name: 'John Plumbing',
  serviceCategoryId: 'cat-plumbing',
  availability: ProviderAvailability.AVAILABLE,
  verificationStatus: VerificationStatus.PENDING,
  isVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProviderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── FR8: Create Provider Profile ────────────────────────────────
  describe('createProfile', () => {
    it('should create a provider profile successfully', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (ProviderModel.findByUserId as jest.Mock).mockResolvedValue(null);
      (ProviderModel.create as jest.Mock).mockResolvedValue(mockProvider);

      const result = await ProviderService.createProfile(
        'user-uuid-1',
        'John Plumbing',
        'cat-plumbing',
        { priceRangeMin: 5000, priceRangeMax: 50000 }
      );

      expect(result).toEqual(mockProvider);
      expect(ProviderModel.create).toHaveBeenCalledWith(
        'user-uuid-1',
        'John Plumbing',
        'cat-plumbing',
        { priceRangeMin: 5000, priceRangeMax: 50000 }
      );
    });

    it('should throw error if user not found', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ProviderService.createProfile('nonexistent', 'Name', 'cat-1', {})
      ).rejects.toThrow('User not found');
    });

    it('should throw error if user is not a provider', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: 'customer',
      });

      await expect(
        ProviderService.createProfile('user-uuid-1', 'Name', 'cat-1', {})
      ).rejects.toThrow('User is not a provider');
    });

    it('should throw error if profile already exists', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (ProviderModel.findByUserId as jest.Mock).mockResolvedValue(mockProvider);

      await expect(
        ProviderService.createProfile('user-uuid-1', 'Name', 'cat-1', {})
      ).rejects.toThrow('Provider profile already exists');
    });
  });

  // ─── FR13: Get Provider Profile ──────────────────────────────────
  describe('getProfile', () => {
    it('should return provider with full details', async () => {
      const detailedProvider = {
        ...mockProvider,
        categoryName: 'Plumbing',
        averageRating: 4.5,
      };
      (ProviderModel.findByIdWithDetails as jest.Mock).mockResolvedValue(detailedProvider);

      const result = await ProviderService.getProfile('provider-uuid-1');

      expect(result.categoryName).toBe('Plumbing');
    });

    it('should throw error if provider not found', async () => {
      (ProviderModel.findByIdWithDetails as jest.Mock).mockResolvedValue(null);

      await expect(
        ProviderService.getProfile('nonexistent')
      ).rejects.toThrow('Provider not found');
    });
  });

  // ─── Get profile by user ID ──────────────────────────────────────
  describe('getProfileByUserId', () => {
    it('should return provider profile by user ID', async () => {
      (ProviderModel.findByUserId as jest.Mock).mockResolvedValue(mockProvider);
      (ProviderModel.findByIdWithDetails as jest.Mock).mockResolvedValue(mockProvider);

      const result = await ProviderService.getProfileByUserId('user-uuid-1');

      expect(result).toEqual(mockProvider);
    });

    it('should throw error if provider not found', async () => {
      (ProviderModel.findByUserId as jest.Mock).mockResolvedValue(null);

      await expect(
        ProviderService.getProfileByUserId('nonexistent')
      ).rejects.toThrow('Provider profile not found');
    });
  });

  // ─── Update Profile ──────────────────────────────────────────────
  describe('updateProfile', () => {
    it('should update profile for owner', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);
      (ProviderModel.update as jest.Mock).mockResolvedValue({
        ...mockProvider,
        name: 'Updated Name',
      });

      const result = await ProviderService.updateProfile(
        'provider-uuid-1',
        'user-uuid-1',
        { name: 'Updated Name' }
      );

      expect(result!.name).toBe('Updated Name');
    });

    it('should throw error if provider not found', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ProviderService.updateProfile('nonexistent', 'user-uuid-1', {})
      ).rejects.toThrow('Provider not found');
    });

    it('should throw error if user is not the owner', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);

      await expect(
        ProviderService.updateProfile('provider-uuid-1', 'other-user', {})
      ).rejects.toThrow('Unauthorized: You can only update your own profile');
    });
  });

  // ─── FR9: Update Availability ────────────────────────────────────
  describe('updateAvailability', () => {
    it('should update availability for owner', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);
      (ProviderModel.updateAvailability as jest.Mock).mockResolvedValue({
        ...mockProvider,
        availability: ProviderAvailability.BUSY,
      });

      const result = await ProviderService.updateAvailability(
        'provider-uuid-1',
        'user-uuid-1',
        ProviderAvailability.BUSY
      );

      expect(result!.availability).toBe(ProviderAvailability.BUSY);
    });

    it('should throw error if not the owner', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);

      await expect(
        ProviderService.updateAvailability(
          'provider-uuid-1',
          'other-user',
          ProviderAvailability.OFFLINE
        )
      ).rejects.toThrow('Unauthorized: You can only update your own availability');
    });
  });

  // ─── FR10-12: Search Providers ───────────────────────────────────
  describe('searchProviders', () => {
    it('should return providers matching filters', async () => {
      const providers = [mockProvider];
      (ProviderModel.search as jest.Mock).mockResolvedValue(providers);

      const result = await ProviderService.searchProviders({
        serviceCategoryId: 'cat-plumbing',
        minRating: 3,
        availability: ProviderAvailability.AVAILABLE,
      });

      expect(result).toHaveLength(1);
      expect(ProviderModel.search).toHaveBeenCalledWith({
        serviceCategoryId: 'cat-plumbing',
        minRating: 3,
        availability: ProviderAvailability.AVAILABLE,
      });
    });

    it('should search by location (FR11)', async () => {
      (ProviderModel.search as jest.Mock).mockResolvedValue([]);

      await ProviderService.searchProviders({
        latitude: -1.9403,
        longitude: 29.8739,
        maxDistance: 10,
      });

      expect(ProviderModel.search).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: -1.9403,
          longitude: 29.8739,
          maxDistance: 10,
        })
      );
    });

    it('should filter by price range', async () => {
      (ProviderModel.search as jest.Mock).mockResolvedValue([]);

      await ProviderService.searchProviders({
        minPrice: 1000,
        maxPrice: 50000,
      });

      expect(ProviderModel.search).toHaveBeenCalledWith(
        expect.objectContaining({ minPrice: 1000, maxPrice: 50000 })
      );
    });
  });

  // ─── Portfolio (Work Gallery FR13) ───────────────────────────────
  describe('addPortfolioImage', () => {
    it('should add portfolio image for owner', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);
      (ProviderPortfolioModel.create as jest.Mock).mockResolvedValue({
        id: 'portfolio-uuid-1',
        providerId: 'provider-uuid-1',
        imageUrl: 'https://example.com/image.jpg',
      });

      const result = await ProviderService.addPortfolioImage(
        'provider-uuid-1',
        'user-uuid-1',
        'https://example.com/image.jpg',
        'My best work'
      );

      expect(result.imageUrl).toBe('https://example.com/image.jpg');
    });

    it('should throw error if not the owner', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);

      await expect(
        ProviderService.addPortfolioImage(
          'provider-uuid-1',
          'other-user',
          'https://example.com/image.jpg'
        )
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('deletePortfolioImage', () => {
    it('should delete portfolio image for owner', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);
      (ProviderPortfolioModel.delete as jest.Mock).mockResolvedValue(true);

      const result = await ProviderService.deletePortfolioImage(
        'portfolio-uuid-1',
        'provider-uuid-1',
        'user-uuid-1'
      );

      expect(result).toEqual({ success: true });
    });

    it('should throw error if image not found', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);
      (ProviderPortfolioModel.delete as jest.Mock).mockResolvedValue(false);

      await expect(
        ProviderService.deletePortfolioImage(
          'nonexistent',
          'provider-uuid-1',
          'user-uuid-1'
        )
      ).rejects.toThrow('Portfolio image not found');
    });
  });

  describe('getPortfolio', () => {
    it('should return portfolio images', async () => {
      const portfolio = [{ id: 'p1', imageUrl: 'url1' }];
      (ProviderPortfolioModel.findByProviderId as jest.Mock).mockResolvedValue(portfolio);

      const result = await ProviderService.getPortfolio('provider-uuid-1');

      expect(result).toEqual(portfolio);
    });
  });

  // ─── FR23-25: Provider Verification ──────────────────────────────
  describe('submitVerification', () => {
    it('should submit verification request', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);
      (VerificationRequestModel.findByProviderId as jest.Mock).mockResolvedValue(null);
      (VerificationRequestModel.create as jest.Mock).mockResolvedValue({
        id: 'vr-uuid-1',
        providerId: 'provider-uuid-1',
        status: 'pending',
      });
      (ProviderModel.updateVerificationStatus as jest.Mock).mockResolvedValue(undefined);

      const result = await ProviderService.submitVerification(
        'provider-uuid-1',
        'user-uuid-1',
        {
          idDocument: 'https://example.com/id.pdf',
          certificates: ['cert1'],
          references: ['ref1'],
        }
      );

      expect(result.status).toBe('pending');
      expect(ProviderModel.updateVerificationStatus).toHaveBeenCalledWith(
        'provider-uuid-1',
        VerificationStatus.PENDING,
        false
      );
    });

    it('should throw error if already has pending request', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);
      (VerificationRequestModel.findByProviderId as jest.Mock).mockResolvedValue({
        id: 'vr-uuid-1',
        status: 'pending',
      });

      await expect(
        ProviderService.submitVerification('provider-uuid-1', 'user-uuid-1', {})
      ).rejects.toThrow('You already have a pending verification request');
    });

    it('should throw error if not the owner', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);

      await expect(
        ProviderService.submitVerification('provider-uuid-1', 'other-user', {})
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('getVerificationRequest', () => {
    it('should return verification request for owner', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);
      (VerificationRequestModel.findByProviderId as jest.Mock).mockResolvedValue({
        id: 'vr-uuid-1',
        status: 'pending',
      });

      const result = await ProviderService.getVerificationRequest(
        'provider-uuid-1',
        'user-uuid-1'
      );

      expect(result).toBeDefined();
    });

    it('should throw error for unauthorized user', async () => {
      (ProviderModel.findById as jest.Mock).mockResolvedValue(mockProvider);

      await expect(
        ProviderService.getVerificationRequest('provider-uuid-1', 'other-user')
      ).rejects.toThrow('Unauthorized');
    });
  });
});
