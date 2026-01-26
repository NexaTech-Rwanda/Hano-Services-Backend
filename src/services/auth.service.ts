import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';
import { UserModel } from '../models/User';
import { OTPModel } from '../models/OTP';
import { UserRole } from '../types';
import { SmsService } from './sms.service';

export interface AuthTokens {
  accessToken: string;
  user: {
    id: string;
    phone: string;
    email?: string;
    role: UserRole;
    isPhoneVerified: boolean;
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
   * Register a new user
   */
  static async register(
    phone: string,
    role: UserRole,
    email?: string,
    password?: string
  ): Promise<AuthTokens> {
    // Check if user already exists
    const existingUser = await UserModel.findByPhone(phone);
    if (existingUser) {
      throw new Error('User with this phone number already exists');
    }

    // Create user
    const user = await UserModel.create(phone, role, email, password);

    // Generate token
    const accessToken = this.generateToken(user.id, user.role);

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
      },
    };
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

    const accessToken = this.generateToken(user.id, user.role);

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
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

    const accessToken = this.generateToken(user.id, user.role);

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isPhoneVerified: true,
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
}
