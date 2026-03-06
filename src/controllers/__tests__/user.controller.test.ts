/**
 * User Controller Unit Tests
 * Tests HTTP layer for user profile management endpoints
 */

import { Response } from 'express';
import { UserController } from '../../controllers/user.controller';
import { UserModel } from '../../models/User';
import { ProviderModel } from '../../models/Provider';
import { StorageService } from '../../services/storage.service';
import { AuthRequest } from '../../middleware/auth';
import { UserRole } from '../../types';

jest.mock('../../models/User');
jest.mock('../../models/Provider');
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
    userRole: UserRole.CUSTOMER,
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

const mockUser = {
  id: 'user-uuid-1',
  username: 'testuser',
  phone: '+250780000001',
  email: 'test@example.com',
  role: UserRole.CUSTOMER,
  profilePhoto: null,
  preferredContactMethod: 'phone',
};

describe('UserController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Get Profile ─────────────────────────────────────────────────
  describe('getProfile', () => {
    it('should return 200 with user profile', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      const { req, res } = createMockAuthReqRes();

      const handler = getHandler(UserController.getProfile);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ user: expect.any(Object) }),
        })
      );
    });

    it('should return 404 when user not found', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      const { req, res } = createMockAuthReqRes({ userId: 'nonexistent' });

      const handler = getHandler(UserController.getProfile);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should include provider profile for provider users', async () => {
      const providerUser = { ...mockUser, role: UserRole.PROVIDER };
      (UserModel.findById as jest.Mock).mockResolvedValue(providerUser);
      (ProviderModel.findByUserId as jest.Mock).mockResolvedValue({
        id: 'p1',
        name: 'Provider Name',
      });

      const { req, res } = createMockAuthReqRes({
        userRole: UserRole.PROVIDER,
      });

      const handler = getHandler(UserController.getProfile);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: expect.any(Object),
          }),
        })
      );
    });
  });

  // ─── Update Profile ──────────────────────────────────────────────
  describe('updateProfile', () => {
    it('should return 200 on successful profile update', async () => {
      (UserModel.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        username: 'updateduser',
      });

      const { req, res } = createMockAuthReqRes({
        body: { username: 'updateduser', email: 'new@example.com' },
      });

      const handler = getHandler(UserController.updateProfile);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on error', async () => {
      (UserModel.update as jest.Mock).mockRejectedValue(
        new Error('Username already taken')
      );

      const { req, res } = createMockAuthReqRes({
        body: { username: 'taken' },
      });

      const handler = getHandler(UserController.updateProfile);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── Change Password ─────────────────────────────────────────────
  describe('changePassword', () => {
    it('should return 200 on successful password change', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.verifyPassword as jest.Mock).mockResolvedValue(true);
      (UserModel.updatePassword as jest.Mock).mockResolvedValue(undefined);

      const { req, res } = createMockAuthReqRes({
        body: {
          currentPassword: 'oldpass',
          newPassword: 'newpass123',
          confirmPassword: 'newpass123',
        },
      });

      const handler = getHandler(UserController.changePassword);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when passwords don\'t match', async () => {
      const { req, res } = createMockAuthReqRes({
        body: {
          currentPassword: 'oldpass',
          newPassword: 'newpass123',
          confirmPassword: 'mismatch',
        },
      });

      const handler = getHandler(UserController.changePassword);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 when current password is wrong', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.verifyPassword as jest.Mock).mockResolvedValue(false);

      const { req, res } = createMockAuthReqRes({
        body: {
          currentPassword: 'wrongpass',
          newPassword: 'newpass123',
          confirmPassword: 'newpass123',
        },
      });

      const handler = getHandler(UserController.changePassword);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── Update Contact Method ───────────────────────────────────────
  describe('updateContactMethod', () => {
    it('should return 200 on successful update', async () => {
      (UserModel.updatePreferredContactMethod as jest.Mock).mockResolvedValue({
        ...mockUser,
        preferredContactMethod: 'whatsapp',
      });

      const { req, res } = createMockAuthReqRes({
        body: { preferredContactMethod: 'whatsapp' },
      });

      const handler = getHandler(UserController.updateContactMethod);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ─── Upload Photo ────────────────────────────────────────────────
  describe('uploadPhoto', () => {
    it('should return 200 on successful photo upload', async () => {
      (StorageService.uploadImage as jest.Mock).mockResolvedValue({
        url: 'https://storage.example.com/photos/user.jpg',
      });
      (UserModel.updateProfilePhoto as jest.Mock).mockResolvedValue({
        ...mockUser,
        profilePhoto: 'https://storage.example.com/photos/user.jpg',
      });

      const { req, res } = createMockAuthReqRes({
        file: {
          mimetype: 'image/jpeg',
          originalname: 'photo.jpg',
          buffer: Buffer.from('fake-image'),
        },
      });

      const handler = getHandler(UserController.uploadPhoto);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when no file provided', async () => {
      const { req, res } = createMockAuthReqRes({ file: undefined });

      const handler = getHandler(UserController.uploadPhoto);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid mime type', async () => {
      const { req, res } = createMockAuthReqRes({
        file: {
          mimetype: 'application/pdf',
          originalname: 'doc.pdf',
          buffer: Buffer.from('fake'),
        },
      });

      const handler = getHandler(UserController.uploadPhoto);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── Update Provider Profile ─────────────────────────────────────
  describe('updateProviderProfile', () => {
    it('should return 200 on successful provider details update', async () => {
      (ProviderModel.findByUserId as jest.Mock).mockResolvedValue({
        id: 'p1',
        userId: 'user-uuid-1',
      });
      (ProviderModel.update as jest.Mock).mockResolvedValue({
        id: 'p1',
        name: 'Updated Provider',
      });

      const { req, res } = createMockAuthReqRes({
        userRole: UserRole.PROVIDER,
        body: { name: 'Updated Provider' },
      });

      const handler = getHandler(UserController.updateProviderProfile);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when provider profile not found', async () => {
      (ProviderModel.findByUserId as jest.Mock).mockResolvedValue(null);

      const { req, res } = createMockAuthReqRes({
        userRole: UserRole.PROVIDER,
      });

      const handler = getHandler(UserController.updateProviderProfile);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ─── Track Location ──────────────────────────────────────────────
  describe('trackLocation', () => {
    it('should return 200 on successful location update', async () => {
      (UserModel.updateLocation as jest.Mock).mockResolvedValue(undefined);

      const { req, res } = createMockAuthReqRes({
        body: { latitude: -1.9403, longitude: 29.8739 },
      });

      const handler = getHandler(UserController.trackLocation);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for missing coordinates', async () => {
      const { req, res } = createMockAuthReqRes({
        body: {},
      });

      const handler = getHandler(UserController.trackLocation);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
