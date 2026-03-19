import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';
import { logError } from '../utils/logger';

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  static register = [
    validate([
      body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
      body('phone')
        .isMobilePhone('any')
        .withMessage('Valid phone number is required'),
      body('role')
        .isIn(['customer', 'provider', 'admin'])
        .withMessage('Valid role is required'),
      body('email').optional().isEmail().withMessage('Valid email is required'),
      body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    ]),
    async (req: Request, res: Response) => {
      try {
        const { username, phone, role, email, password } = req.body;

        const result = await AuthService.register(
          username,
          phone,
          role as UserRole,
          email,
          password
        );

        // Immediately trigger OTP generation and sending upon successful registration
        await AuthService.sendOTP(phone);

        console.log("User registered successfully:", result);

        return res.status(201).json({
          status: 'success',
          data: result,
        });
      } catch (error: any) {
        logError(error.message, 'AuthController.register');
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Send OTP
   * POST /api/auth/send-otp
   */
  static sendOTP = [
    validate([
      body('phone')
        .isMobilePhone('any')
        .withMessage('Valid phone number is required'),
    ]),
    async (req: Request, res: Response) => {
      try {
        const { phone } = req.body;

        await AuthService.sendOTP(phone);

        console.log(`OTP sent to ${phone} successfully`);

        return res.json({
          status: 'success',
          message: 'OTP sent successfully',
        });
      } catch (error: any) {
        logError(error.message, 'AuthController.sendOTP');
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Verify OTP
   * POST /api/auth/verify-otp
   */
  static verifyOTP = [
    validate([
      body('phone')
        .isMobilePhone('any')
        .withMessage('Valid phone number is required'),
      body('code')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('Valid 6-digit OTP code is required'),
    ]),
    async (req: Request, res: Response) => {
      try {
        const { phone, code } = req.body;

        const result = await AuthService.loginWithOTP(phone, code);

        console.log(`Phone number ${phone} verified and user logged in successfully`);

        return res.json({
          status: 'success',
          message: 'Phone number verified successfully',
          data: result,
        });
      } catch (error: any) {
        logError(error.message, 'AuthController.verifyOTP');
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Login with password
   * POST /api/auth/login
   */
  static login = [
    validate([
      body('phone')
        .isMobilePhone('any')
        .withMessage('Valid phone number is required'),
      body('password').notEmpty().withMessage('Password is required'),
    ]),
    async (req: Request, res: Response) => {
      try {
        const { phone, password } = req.body;

        const result = await AuthService.login(phone, password);

        console.log(`User with phone ${phone} logged in successfully`);

        return res.json({
          status: 'success',
          data: result,
        });
      } catch (error: any) {
        logError(error.message, 'AuthController.login');
        return res.status(401).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Login with OTP
   * POST /api/auth/login-otp
   */
  static loginWithOTP = [
    validate([
      body('phone')
        .isMobilePhone('any')
        .withMessage('Valid phone number is required'),
      body('code')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('Valid 6-digit OTP code is required'),
    ]),
    async (req: Request, res: Response) => {
      try {
        const { phone, code } = req.body;

        const result = await AuthService.loginWithOTP(phone, code);

        console.log(`User with phone ${phone} logged in with OTP successfully`);

        return res.json({
          status: 'success',
          data: result,
        });
      } catch (error: any) {
        logError(error.message, 'AuthController.loginWithOTP');
        return res.status(401).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Reset password
   * POST /api/auth/reset-password
   */
  static resetPassword = [
    validate([
      body('phone')
        .isMobilePhone('any')
        .withMessage('Valid phone number is required'),
      body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    ]),
    async (req: Request, res: Response) => {
      try {
        const { phone, newPassword } = req.body;

        await AuthService.resetPassword(phone, newPassword);

        console.log(`Password reset for phone ${phone} successfully`);

        return res.json({
          status: 'success',
          message: 'Password reset successfully',
        });
      } catch (error: any) {
        logError(error.message, 'AuthController.resetPassword');
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
    },
  ];

  /**
   * Refresh access token
   * POST /api/auth/refresh-token
   */
  static async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        logError('Refresh token is required', 'AuthController.refreshToken');
        return res.status(400).json({
          status: 'error',
          message: 'refreshToken is required',
        });
      }

      const result = await AuthService.refreshTokens(refreshToken);

      console.log(`Access token refreshed successfully for refresh token: ${refreshToken}`);

      return res.json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logError(error.message, 'AuthController.refreshToken');
      return res.status(401).json({
        status: 'error',
        message: error.message || 'Invalid refresh token',
      });
    }
  }

  /**
   * Logout (revoke all refresh tokens for current user)
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<Response> {
    try {
      // `authenticate` middleware should attach userId to request
      const userId = (req as any).userId as string | undefined;
      if (!userId) {
        logError('Unauthorized', 'AuthController.logout');
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
        });
      }

      await AuthService.logout(userId);

      console.log(`User with ID ${userId} logged out successfully`);

      return res.json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      logError(error.message, 'AuthController.logout');
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to logout',
      });
    }
  }
}
