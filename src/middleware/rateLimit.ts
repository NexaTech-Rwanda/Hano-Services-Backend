import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication-related endpoints
 * - Protects against brute-force login / OTP abuse
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts from this IP, please try again later.',
  },
});

/**
 * Generic limiter for write-heavy endpoints (creating resources)
 * - Apply to POST/PUT/PATCH/DELETE routes that create or modify data
 */
export const createResourceLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 write requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many write operations from this IP, please slow down.',
  },
});

