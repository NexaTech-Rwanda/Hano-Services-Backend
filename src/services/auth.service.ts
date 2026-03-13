import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/config';
import { UserModel } from '../models/User';
import { OTPModel } from '../models/OTP';
import { UserRole } from '../types';
import { SmsService } from './sms.service';
import { RefreshTokenModel } from '../models/RefreshToken';
import { logError } from '../utils/logger';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    phone: string;
    email?: string;
    role: UserRole;
    isPhoneVerified: boolean;
    lastLogin?: Date;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    pushNotifications?: boolean;
  };
}

export class AuthService {
  /**
   * Generate JWT token
   */
  static generateToken(userId: string, role: UserRole): string {
    const payload = { userId, role };
    const secret = config.jwt.secret as Secret;
    const options: SignOptions = {
      // Cast to supported expiresIn type; value is validated via config/env
      expiresIn: config.jwt.expiresIn as unknown as SignOptions['expiresIn'],
    };

    return jwt.sign(payload, secret, options);
  }

  /**
   * Generate and persist a refresh token for a user
   */
  static async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshExpiresInDays);

    await RefreshTokenModel.create(userId, token, expiresAt);
    return token;
  }

  /**
   * Register a new user
   */
  static async register(
    username: string,
    phone: string,
    role: UserRole,
    email?: string,
    password?: string
  ): Promise<AuthTokens> {
    try {
      // Check if username already exists
      const existingUserByUsername = await UserModel.findByUsername(username);
      if (existingUserByUsername) {
        throw new Error('Username already taken');
      }

      // Check if phone number already exists
      const existingUserByPhone = await UserModel.findByPhone(phone);
      if (existingUserByPhone) {
        throw new Error('User with this phone number already exists');
      }

      // Create user
      const user = await UserModel.create(username, phone, role, email, password);

      // Generate tokens
      const accessToken = this.generateToken(user.id, user.role);
      const refreshToken = await this.generateRefreshToken(user.id);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isPhoneVerified: user.isPhoneVerified,
          lastLogin: user.lastLogin,
          emailNotifications: user.emailNotifications,
          smsNotifications: user.smsNotifications,
          pushNotifications: user.pushNotifications,
        },
      };
    } catch (error: any) {
      logError(error.message, 'AuthService.register');
      throw error;
    }
  }

  /**
   * Send OTP for phone verification
   */
  static async sendOTP(phone: string): Promise<void> {
    // Check if user exists
    const user = await UserModel.findByPhone(phone);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate and store OTP
    const code = await OTPModel.create(phone);

    const message = `Your HanoServices verification code is: ${code}. It expires in ${config.otp.expiryMinutes} minutes.`;

    // In development, log OTP to console for easier testing
    if (config.nodeEnv === 'development') {
      console.log(`OTP for ${phone}: ${code}`);
    }

    // Send via SMS (best-effort; log errors but don't expose them to users)
    try {
      await SmsService.sendSMS(phone, message);
    } catch (err) {
      console.error('Failed to send OTP SMS:', err);
      // Optionally: rethrow in production if you want to block flow when SMS fails
      if (config.nodeEnv === 'production') {
        throw new Error('Failed to send verification SMS. Please try again later.');
      }
    }
  }

  /**
   * Verify OTP and mark phone as verified
   */
  static async verifyOTP(phone: string, code: string): Promise<boolean> {
    const isValid = await OTPModel.verify(phone, code);

    if (isValid) {
      const user = await UserModel.findByPhone(phone);
      if (user && !user.isPhoneVerified) {
        await UserModel.verifyPhone(user.id);
      }
    }

    return isValid;
  }

  /**
   * Login with phone and password
   */
  static async login(phone: string, password: string): Promise<AuthTokens> {
    const user = await UserModel.findByPhone(phone);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.password) {
      throw new Error('Password not set. Please use OTP login or set a password.');
    }

    const isValidPassword = await UserModel.verifyPassword(
      password,
      user.password
    );
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    await UserModel.updateLastLogin(user.id);
    const accessToken = this.generateToken(user.id, user.role);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        lastLogin: new Date(),
        emailNotifications: user.emailNotifications,
        smsNotifications: user.smsNotifications,
        pushNotifications: user.pushNotifications,
      },
    };
  }

  /**
   * Login with OTP (passwordless)
   */
  static async loginWithOTP(phone: string, code: string): Promise<AuthTokens> {
    const isValid = await OTPModel.verify(phone, code);
    if (!isValid) {
      throw new Error('Invalid or expired OTP');
    }

    const user = await UserModel.findByPhone(phone);
    if (!user) {
      throw new Error('User not found');
    }

    // Mark phone as verified if not already
    if (!user.isPhoneVerified) {
      await UserModel.verifyPhone(user.id);
    }
    
    await UserModel.updateLastLogin(user.id);

    const accessToken = this.generateToken(user.id, user.role);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isPhoneVerified: true,
        lastLogin: new Date(),
        emailNotifications: user.emailNotifications,
        smsNotifications: user.smsNotifications,
        pushNotifications: user.pushNotifications,
      },
    };
  }

  /**
   * Reset password
   */
  static async resetPassword(
    phone: string,
    newPassword: string
  ): Promise<void> {
    const user = await UserModel.findByPhone(phone);
    if (!user) {
      throw new Error('User not found');
    }

    await UserModel.updatePassword(user.id, newPassword);
  }

  /**
   * Refresh access token using a valid refresh token
   */
  static async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const record = await RefreshTokenModel.findValid(refreshToken);
    if (!record) {
      throw new Error('Invalid or expired refresh token');
    }

    const user = await UserModel.findById(record.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Rotate refresh token: revoke old and issue new
    await RefreshTokenModel.revokeById(record.id);
    const newRefreshToken = await this.generateRefreshToken(user.id);
    const accessToken = this.generateToken(user.id, user.role);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
      },
    };
  }

  /**
   * Logout user by revoking all their refresh tokens
   */
  static async logout(userId: string): Promise<void> {
    await RefreshTokenModel.revokeAllForUser(userId);
  }
}
