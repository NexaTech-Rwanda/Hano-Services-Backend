/**
 * Auth Service Unit Tests
 * SRS Coverage: FR1 (Register), FR2 (Verify OTP), FR3 (Store Roles),
 *               FR4 (Login phone+password / OTP), FR5 (Password Reset)
 */

import { AuthService } from '../../services/auth.service';
import { UserModel } from '../../models/User';
import { OTPModel } from '../../models/OTP';
import { RefreshTokenModel } from '../../models/RefreshToken';
import { SmsService } from '../../services/sms.service';
import { UserRole } from '../../types';

// Mock all dependencies
jest.mock('../../models/User');
jest.mock('../../models/OTP');
jest.mock('../../models/RefreshToken');
jest.mock('../../services/sms.service');
jest.mock('../../config/config', () => ({
  config: {
    jwt: {
      secret: 'test-jwt-secret-key-for-testing',
      expiresIn: '1h',
      refreshExpiresInDays: 30,
    },
    otp: { expiryMinutes: 5 },
    nodeEnv: 'test',
  },
}));

const mockUser = {
  id: 'user-uuid-1',
  username: 'testuser',
  phone: '+250780000001',
  email: 'test@example.com',
  role: UserRole.CUSTOMER,
  isPhoneVerified: false,
  password: '$2a$10$hashedpassword',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── FR1: Registration ───────────────────────────────────────────
  describe('register', () => {
    it('should register a new user successfully and return tokens', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(null);
      (UserModel.findByPhone as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue(mockUser);
      (RefreshTokenModel.create as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.register(
        'testuser',
        '+250780000001',
        UserRole.CUSTOMER,
        'test@example.com',
        'password123'
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.username).toBe('testuser');
      expect(result.user.role).toBe(UserRole.CUSTOMER);
      expect(UserModel.create).toHaveBeenCalledWith(
        'testuser',
        '+250780000001',
        UserRole.CUSTOMER,
        'test@example.com',
        'password123'
      );
    });

    it('should throw error when username already exists', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        AuthService.register('testuser', '+250780000002', UserRole.CUSTOMER)
      ).rejects.toThrow('Username already taken');
    });

    it('should throw error when phone already exists', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(null);
      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        AuthService.register('newuser', '+250780000001', UserRole.CUSTOMER)
      ).rejects.toThrow('User with this phone number already exists');
    });

    it('should register provider role correctly (FR3)', async () => {
      const providerUser = { ...mockUser, id: 'provider-uuid', role: UserRole.PROVIDER };
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(null);
      (UserModel.findByPhone as jest.Mock).mockResolvedValue(null);
      (UserModel.create as jest.Mock).mockResolvedValue(providerUser);
      (RefreshTokenModel.create as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.register(
        'provideruser',
        '+250780000003',
        UserRole.PROVIDER
      );

      expect(result.user.role).toBe(UserRole.PROVIDER);
    });
  });

  // ─── FR2: Send OTP ───────────────────────────────────────────────
  describe('sendOTP', () => {
    it('should send OTP to existing user', async () => {
      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (OTPModel.create as jest.Mock).mockResolvedValue('123456');
      (SmsService.sendSMS as jest.Mock).mockResolvedValue(undefined);

      await AuthService.sendOTP('+250780000001');

      expect(OTPModel.create).toHaveBeenCalledWith('+250780000001');
    });

    it('should throw error if user not found', async () => {
      (UserModel.findByPhone as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.sendOTP('+250780000099')).rejects.toThrow(
        'User not found'
      );
    });
  });

  // ─── FR2: Verify OTP ────────────────────────────────────────────
  describe('verifyOTP', () => {
    it('should verify OTP and mark phone as verified', async () => {
      (OTPModel.verify as jest.Mock).mockResolvedValue(true);
      (UserModel.findByPhone as jest.Mock).mockResolvedValue({
        ...mockUser,
        isPhoneVerified: false,
      });
      (UserModel.verifyPhone as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.verifyOTP('+250780000001', '123456');

      expect(result).toBe(true);
      expect(UserModel.verifyPhone).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return false for invalid OTP', async () => {
      (OTPModel.verify as jest.Mock).mockResolvedValue(false);

      const result = await AuthService.verifyOTP('+250780000001', '000000');

      expect(result).toBe(false);
      expect(UserModel.verifyPhone).not.toHaveBeenCalled();
    });

    it('should not re-verify an already verified phone', async () => {
      (OTPModel.verify as jest.Mock).mockResolvedValue(true);
      (UserModel.findByPhone as jest.Mock).mockResolvedValue({
        ...mockUser,
        isPhoneVerified: true,
      });

      await AuthService.verifyOTP('+250780000001', '123456');

      expect(UserModel.verifyPhone).not.toHaveBeenCalled();
    });
  });

  // ─── FR4: Login with password ────────────────────────────────────
  describe('login', () => {
    it('should login with valid credentials', async () => {
      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.verifyPassword as jest.Mock).mockResolvedValue(true);
      (RefreshTokenModel.create as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.login('+250780000001', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.phone).toBe('+250780000001');
    });

    it('should throw error for invalid phone (user not found)', async () => {
      (UserModel.findByPhone as jest.Mock).mockResolvedValue(null);

      await expect(
        AuthService.login('+250780000099', 'password123')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error when password not set', async () => {
      (UserModel.findByPhone as jest.Mock).mockResolvedValue({
        ...mockUser,
        password: null,
      });

      await expect(
        AuthService.login('+250780000001', 'password123')
      ).rejects.toThrow('Password not set');
    });

    it('should throw error for wrong password', async () => {
      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(
        AuthService.login('+250780000001', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  // ─── FR4: Login with OTP ─────────────────────────────────────────
  describe('loginWithOTP', () => {
    it('should login with valid OTP and mark phone as verified', async () => {
      (OTPModel.verify as jest.Mock).mockResolvedValue(true);
      (UserModel.findByPhone as jest.Mock).mockResolvedValue({
        ...mockUser,
        isPhoneVerified: false,
      });
      (UserModel.verifyPhone as jest.Mock).mockResolvedValue(undefined);
      (RefreshTokenModel.create as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.loginWithOTP('+250780000001', '123456');

      expect(result).toHaveProperty('accessToken');
      expect(result.user.isPhoneVerified).toBe(true);
      expect(UserModel.verifyPhone).toHaveBeenCalled();
    });

    it('should throw error for invalid OTP', async () => {
      (OTPModel.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        AuthService.loginWithOTP('+250780000001', '000000')
      ).rejects.toThrow('Invalid or expired OTP');
    });

    it('should throw error if user not found after OTP verified', async () => {
      (OTPModel.verify as jest.Mock).mockResolvedValue(true);
      (UserModel.findByPhone as jest.Mock).mockResolvedValue(null);

      await expect(
        AuthService.loginWithOTP('+250780000099', '123456')
      ).rejects.toThrow('User not found');
    });
  });

  // ─── FR5: Reset Password ─────────────────────────────────────────
  describe('resetPassword', () => {
    it('should reset password for existing user', async () => {
      (UserModel.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (UserModel.updatePassword as jest.Mock).mockResolvedValue(undefined);

      await AuthService.resetPassword('+250780000001', 'newPassword123');

      expect(UserModel.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        'newPassword123'
      );
    });

    it('should throw error if user not found', async () => {
      (UserModel.findByPhone as jest.Mock).mockResolvedValue(null);

      await expect(
        AuthService.resetPassword('+250780000099', 'newPassword123')
      ).rejects.toThrow('User not found');
    });
  });

  // ─── Token refresh ───────────────────────────────────────────────
  describe('refreshTokens', () => {
    it('should rotate refresh token and return new tokens', async () => {
      const tokenRecord = {
        id: 'token-uuid',
        userId: mockUser.id,
        token: 'old-refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
      };
      (RefreshTokenModel.findValid as jest.Mock).mockResolvedValue(tokenRecord);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (RefreshTokenModel.revokeById as jest.Mock).mockResolvedValue(undefined);
      (RefreshTokenModel.create as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.refreshTokens('old-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(RefreshTokenModel.revokeById).toHaveBeenCalledWith('token-uuid');
    });

    it('should throw error for invalid refresh token', async () => {
      (RefreshTokenModel.findValid as jest.Mock).mockResolvedValue(null);

      await expect(
        AuthService.refreshTokens('invalid-token')
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw error if user no longer exists', async () => {
      const tokenRecord = {
        id: 'token-uuid',
        userId: 'deleted-user',
        token: 'refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
      };
      (RefreshTokenModel.findValid as jest.Mock).mockResolvedValue(tokenRecord);
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        AuthService.refreshTokens('refresh-token')
      ).rejects.toThrow('User not found');
    });
  });

  // ─── Logout ──────────────────────────────────────────────────────
  describe('logout', () => {
    it('should revoke all refresh tokens for user', async () => {
      (RefreshTokenModel.revokeAllForUser as jest.Mock).mockResolvedValue(
        undefined
      );

      await AuthService.logout('user-uuid-1');

      expect(RefreshTokenModel.revokeAllForUser).toHaveBeenCalledWith(
        'user-uuid-1'
      );
    });
  });

  // ─── Token generation ────────────────────────────────────────────
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = AuthService.generateToken('user-uuid-1', UserRole.CUSTOMER);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });
});
