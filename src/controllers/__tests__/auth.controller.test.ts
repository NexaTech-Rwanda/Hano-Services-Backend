/**
 * Auth Controller Unit Tests
 * Tests HTTP layer: status codes, response structure, delegation to AuthService
 */

import { Request, Response } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { AuthService } from '../../services/auth.service';

jest.mock('../../services/auth.service');
jest.mock('../../config/config', () => ({
  config: {
    jwt: { secret: 'test-jwt-secret', expiresIn: '1h', refreshExpiresInDays: 30 },
    otp: { expiryMinutes: 5 },
    nodeEnv: 'test',
  },
}));

// Helper to create mock request/response objects
function createMockReqRes(overrides: Partial<Request> = {}): {
  req: Partial<Request> & { userId?: string; userRole?: string };
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
    ...overrides,
  };
  return { req: req as any, res: res as any };
}

// Extract the actual handler function from controller arrays
// Controllers define routes as arrays: [validator1, validator2, ..., handler]
function getHandler(controllerMethod: any[]): Function {
  return controllerMethod[controllerMethod.length - 1];
}

describe('AuthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Register ────────────────────────────────────────────────────
  describe('register', () => {
    it('should return 201 on successful registration', async () => {
      const mockResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'u1', username: 'testuser', role: 'customer' },
      };
      (AuthService.register as jest.Mock).mockResolvedValue(mockResult);

      const { req, res } = createMockReqRes({
        body: {
          username: 'testuser',
          phone: '+250780000001',
          role: 'customer',
          email: 'test@example.com',
          password: 'password123',
        },
      });

      const handler = getHandler(AuthController.register);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: mockResult,
        })
      );
    });

    it('should return 400 on registration failure', async () => {
      (AuthService.register as jest.Mock).mockRejectedValue(
        new Error('Username already taken')
      );

      const { req, res } = createMockReqRes({
        body: {
          username: 'testuser',
          phone: '+250780000001',
          role: 'customer',
        },
      });

      const handler = getHandler(AuthController.register);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Username already taken',
        })
      );
    });
  });

  // ─── Send OTP ────────────────────────────────────────────────────
  describe('sendOTP', () => {
    it('should return 200 on successful OTP send', async () => {
      (AuthService.sendOTP as jest.Mock).mockResolvedValue(undefined);

      const { req, res } = createMockReqRes({
        body: { phone: '+250780000001' },
      });

      const handler = getHandler(AuthController.sendOTP);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: expect.stringContaining('OTP'),
        })
      );
    });

    it('should return 400 when user not found', async () => {
      (AuthService.sendOTP as jest.Mock).mockRejectedValue(
        new Error('User not found')
      );

      const { req, res } = createMockReqRes({
        body: { phone: '+250780000099' },
      });

      const handler = getHandler(AuthController.sendOTP);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── Verify OTP ──────────────────────────────────────────────────
  describe('verifyOTP', () => {
    it('should return 200 for valid OTP', async () => {
      (AuthService.verifyOTP as jest.Mock).mockResolvedValue(true);

      const { req, res } = createMockReqRes({
        body: { phone: '+250780000001', code: '123456' },
      });

      const handler = getHandler(AuthController.verifyOTP);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      );
    });

    it('should return 400 for invalid OTP', async () => {
      (AuthService.verifyOTP as jest.Mock).mockResolvedValue(false);

      const { req, res } = createMockReqRes({
        body: { phone: '+250780000001', code: '000000' },
      });

      const handler = getHandler(AuthController.verifyOTP);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── Login ───────────────────────────────────────────────────────
  describe('login', () => {
    it('should return 200 with tokens on successful login', async () => {
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'u1', phone: '+250780000001' },
      };
      (AuthService.login as jest.Mock).mockResolvedValue(tokens);

      const { req, res } = createMockReqRes({
        body: { phone: '+250780000001', password: 'password123' },
      });

      const handler = getHandler(AuthController.login);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: tokens,
        })
      );
    });

    it('should return 401 for invalid credentials', async () => {
      (AuthService.login as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const { req, res } = createMockReqRes({
        body: { phone: '+250780000001', password: 'wrong' },
      });

      const handler = getHandler(AuthController.login);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── Login with OTP ──────────────────────────────────────────────
  describe('loginWithOTP', () => {
    it('should return 200 with tokens on valid OTP login', async () => {
      const tokens = {
        accessToken: 'at',
        refreshToken: 'rt',
        user: { id: 'u1' },
      };
      (AuthService.loginWithOTP as jest.Mock).mockResolvedValue(tokens);

      const { req, res } = createMockReqRes({
        body: { phone: '+250780000001', code: '123456' },
      });

      const handler = getHandler(AuthController.loginWithOTP);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 for invalid OTP login', async () => {
      (AuthService.loginWithOTP as jest.Mock).mockRejectedValue(
        new Error('Invalid or expired OTP')
      );

      const { req, res } = createMockReqRes({
        body: { phone: '+250780000001', code: '000000' },
      });

      const handler = getHandler(AuthController.loginWithOTP);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── Reset Password ──────────────────────────────────────────────
  describe('resetPassword', () => {
    it('should return 200 on successful password reset', async () => {
      (AuthService.resetPassword as jest.Mock).mockResolvedValue(undefined);

      const { req, res } = createMockReqRes({
        body: { phone: '+250780000001', newPassword: 'newPass123' },
      });

      const handler = getHandler(AuthController.resetPassword);
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ─── Refresh Token ───────────────────────────────────────────────
  describe('refreshToken', () => {
    it('should return new tokens with valid refresh token', async () => {
      const newTokens = { accessToken: 'new-at', refreshToken: 'new-rt' };
      (AuthService.refreshTokens as jest.Mock).mockResolvedValue(newTokens);

      const { req, res } = createMockReqRes({
        body: { refreshToken: 'valid-refresh-token' },
      });

      await AuthController.refreshToken(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: newTokens })
      );
    });

    it('should return 400 when refresh token is missing', async () => {
      const { req, res } = createMockReqRes({ body: {} });

      await AuthController.refreshToken(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 for invalid refresh token', async () => {
      (AuthService.refreshTokens as jest.Mock).mockRejectedValue(
        new Error('Invalid or expired refresh token')
      );

      const { req, res } = createMockReqRes({
        body: { refreshToken: 'expired-token' },
      });

      await AuthController.refreshToken(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── Logout ──────────────────────────────────────────────────────
  describe('logout', () => {
    it('should return 200 on successful logout', async () => {
      (AuthService.logout as jest.Mock).mockResolvedValue(undefined);

      const { req, res } = createMockReqRes();
      req.userId = 'user-uuid-1';

      await AuthController.logout(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(AuthService.logout).toHaveBeenCalledWith('user-uuid-1');
    });

    it('should return 401 when userId is not set', async () => {
      const { req, res } = createMockReqRes();
      // userId not set — user not authenticated

      await AuthController.logout(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
