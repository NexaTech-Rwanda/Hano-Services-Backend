/**
 * Provider Controller Unit Tests
 * Tests HTTP layer for provider profile endpoints
 */

import { Response } from 'express';
import { ProviderController } from '../../controllers/provider.controller';
import { ProviderService } from '../../services/provider.service';
import { StorageService } from '../../services/storage.service';
import { AuthRequest } from '../../middleware/auth';
import { ProviderAvailability, UserRole } from '../../types';

jest.mock('../../services/provider.service');
jest.mock('../../services/storage.service');
jest.mock('../../config/config', () => ({
  config: {
    jwt: { secret: 'test-secret', expiresIn: '1h', refreshExpiresInDays: 30 },
    nodeEnv: 'test',
  },
}));

function createMockAuthReqRes(overrides: any = {}): {
  req: Partial<AuthRequest>;
  res: Partial<Response> & { json: jest.Mock; status: jest.Mock };
} {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const req = {
    body: {},
    params: {},
    query: {},
    headers: {},
    userId: 'user-uuid-1',
    userRole: UserRole.PROVIDER,
    file: undefined,
    ...overrides,
  };
  return { req: req as any, res: res as any };
}

function getHandler(controllerMethod: any[] | Function): Function {
  if (Array.isArray(controllerMethod)) {
    return controllerMethod[controllerMethod.length - 1];
  }
  return controllerMethod;
}

const mockProvider = {
  id: 'provider-uuid-1',
  userId: 'user-uuid-1',
  name: 'John Plumbing',
  serviceCategoryId: 'cat-plumbing',
  availability: ProviderAvailability.AVAILABLE,
};

describe('ProviderController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Create ──────────────────────────────────────────────────────
  describe('create', () => {
    it('should return 201 on successful profile creation', async () => {
      (ProviderService.createProfile as jest.Mock).mockResolvedValue(mockProvider);

      const { req, res } = createMockAuthReqRes({
        body: {
          name: 'John Plumbing',
          serviceCategoryId: 'cat-plumbing',
          priceRangeMin: 5000,
        },
      });

      const handler = getHandler(ProviderController.create);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ provider: mockProvider }),
        })
      );
    });

    it('should return 400 if profile already exists', async () => {
      (ProviderService.createProfile as jest.Mock).mockRejectedValue(
        new Error('Provider profile already exists')
      );

      const { req, res } = createMockAuthReqRes({
        body: { name: 'John', serviceCategoryId: 'cat-1' },
      });

      const handler = getHandler(ProviderController.create);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── Get By ID ───────────────────────────────────────────────────
  describe('getById', () => {
    it('should return 200 with provider details', async () => {
      (ProviderService.getProfile as jest.Mock).mockResolvedValue(mockProvider);

      const { req, res } = createMockAuthReqRes({
        params: { id: 'provider-uuid-1' },
      });

      const handler = getHandler(ProviderController.getById);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when provider not found', async () => {
      (ProviderService.getProfile as jest.Mock).mockRejectedValue(
        new Error('Provider not found')
      );

      const { req, res } = createMockAuthReqRes({
        params: { id: 'nonexistent' },
      });

      const handler = getHandler(ProviderController.getById);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ─── Get My Profile ──────────────────────────────────────────────
  describe('getMyProfile', () => {
    it('should return 200 with current user provider profile', async () => {
      (ProviderService.getProfileByUserId as jest.Mock).mockResolvedValue(mockProvider);

      const { req, res } = createMockAuthReqRes();

      const handler = getHandler(ProviderController.getMyProfile);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if no provider profile', async () => {
      (ProviderService.getProfileByUserId as jest.Mock).mockRejectedValue(
        new Error('Provider profile not found')
      );

      const { req, res } = createMockAuthReqRes();

      const handler = getHandler(ProviderController.getMyProfile);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ─── Update Profile ──────────────────────────────────────────────
  describe('update', () => {
    it('should return 200 on successful update', async () => {
      (ProviderService.updateProfile as jest.Mock).mockResolvedValue({
        ...mockProvider,
        name: 'Updated Name',
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'provider-uuid-1' },
        body: { name: 'Updated Name' },
      });

      const handler = getHandler(ProviderController.update);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 when not the owner', async () => {
      (ProviderService.updateProfile as jest.Mock).mockRejectedValue(
        new Error('Unauthorized: You can only update your own profile')
      );

      const { req, res } = createMockAuthReqRes({
        params: { id: 'provider-uuid-1' },
        userId: 'other-user',
      });

      const handler = getHandler(ProviderController.update);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── Update Availability ─────────────────────────────────────────
  describe('updateAvailability', () => {
    it('should return 200 on successful availability update', async () => {
      (ProviderService.updateAvailability as jest.Mock).mockResolvedValue({
        ...mockProvider,
        availability: ProviderAvailability.BUSY,
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'provider-uuid-1' },
        body: { availability: 'busy' },
      });

      const handler = getHandler(ProviderController.updateAvailability);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ─── Search ──────────────────────────────────────────────────────
  describe('search', () => {
    it('should return 200 with matching providers', async () => {
      (ProviderService.searchProviders as jest.Mock).mockResolvedValue([mockProvider]);

      const { req, res } = createMockAuthReqRes({
        query: { serviceCategoryId: 'cat-plumbing' },
      });

      const handler = getHandler(ProviderController.search);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providers: expect.arrayContaining([mockProvider]),
          }),
        })
      );
    });

    it('should return empty array when no matches', async () => {
      (ProviderService.searchProviders as jest.Mock).mockResolvedValue([]);

      const { req, res } = createMockAuthReqRes({
        query: { serviceCategoryId: 'nonexistent' },
      });

      const handler = getHandler(ProviderController.search);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ─── Portfolio ───────────────────────────────────────────────────
  describe('addPortfolioImage', () => {
    it('should return 201 with uploaded image', async () => {
      (StorageService.uploadImage as jest.Mock).mockResolvedValue({
        url: 'https://example.com/image.jpg',
      });
      (ProviderService.addPortfolioImage as jest.Mock).mockResolvedValue({
        id: 'portfolio-uuid',
        imageUrl: 'https://example.com/image.jpg',
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'provider-uuid-1' },
        file: {
          mimetype: 'image/jpeg',
          originalname: 'photo.jpg',
          buffer: Buffer.from('fake'),
        },
        body: { description: 'Best work' },
      });

      const handler = getHandler(ProviderController.addPortfolioImage);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when no file uploaded', async () => {
      const { req, res } = createMockAuthReqRes({
        params: { id: 'provider-uuid-1' },
        file: undefined,
      });

      const handler = getHandler(ProviderController.addPortfolioImage);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getPortfolio', () => {
    it('should return 200 with portfolio images', async () => {
      (ProviderService.getPortfolio as jest.Mock).mockResolvedValue([
        { id: 'p1', imageUrl: 'url1' },
      ]);

      const { req, res } = createMockAuthReqRes({
        params: { id: 'provider-uuid-1' },
      });

      const handler = getHandler(ProviderController.getPortfolio);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deletePortfolioImage', () => {
    it('should return 200 on successful deletion', async () => {
      (ProviderService.deletePortfolioImage as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'provider-uuid-1', imageId: 'portfolio-uuid-1' },
      });

      const handler = getHandler(ProviderController.deletePortfolioImage);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ─── Verification ────────────────────────────────────────────────
  describe('submitVerification', () => {
    it('should return 201 on successful submission', async () => {
      (ProviderService.submitVerification as jest.Mock).mockResolvedValue({
        id: 'vr-uuid-1',
        status: 'pending',
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'provider-uuid-1' },
        body: { idDocument: 'https://example.com/id.pdf' },
      });

      const handler = getHandler(ProviderController.submitVerification);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if already pending', async () => {
      (ProviderService.submitVerification as jest.Mock).mockRejectedValue(
        new Error('You already have a pending verification request')
      );

      const { req, res } = createMockAuthReqRes({
        params: { id: 'provider-uuid-1' },
      });

      const handler = getHandler(ProviderController.submitVerification);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getVerificationRequest', () => {
    it('should return 200 with verification details', async () => {
      (ProviderService.getVerificationRequest as jest.Mock).mockResolvedValue({
        id: 'vr-uuid-1',
        status: 'pending',
      });

      const { req, res } = createMockAuthReqRes({
        params: { id: 'provider-uuid-1' },
      });

      const handler = getHandler(ProviderController.getVerificationRequest);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
