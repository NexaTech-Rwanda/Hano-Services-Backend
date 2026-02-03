import dotenv from 'dotenv';

dotenv.config();

// Validation function for required environment variables in production
function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && (!value || value === '')) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `This variable is required in production environment.`
    );
  }
  
  return value || '';
}

// Validate critical secrets in production
if (process.env.NODE_ENV === 'production') {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'your-secret-key-change-in-production') {
    throw new Error(
      'JWT_SECRET must be set to a secure value in production. ' +
      'Do not use the default value.'
    );
  }
  
  const dbPassword = process.env.DB_PASSWORD;
  if (!dbPassword || dbPassword === '') {
    throw new Error(
      'DB_PASSWORD must be set in production environment.'
    );
  }
}

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'hanoservices',
    user: process.env.DB_USER || 'postgres',
    password: requireEnv('DB_PASSWORD', ''),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'your-secret-key-change-in-production'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresInDays: parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || '30', 10),
  },

  // OTP
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5'),
  },

  // External Services
  sms: {
    apiKey: process.env.SMS_API_KEY || '',
    apiUrl: process.env.SMS_API_URL || '',
  },

  // Pindo Configuration
  pindo: {
    smsFrom: process.env.PINDO_SMS_FROM || '',
    whatsappFrom: process.env.PINDO_WHATSAPP_FROM || '',
  },

  // Twilio (deprecated - kept for backward compatibility if needed)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    smsFrom: process.env.TWILIO_SMS_FROM || '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || '',
  },

  payments: {
    flutterwave: {
      // Flutterwave v4 API uses OAuth 2.0 with Client-Id and Client-Secret
      clientId: process.env.FLUTTERWAVE_CLIENT_ID || '',
      clientSecret: process.env.FLUTTERWAVE_CLIENT_SECRET || '',
      // Legacy v3 API keys (if you have them, we'll use them as fallback)
      publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
      secretKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
      secretHash: process.env.FLUTTERWAVE_SECRET_HASH || '', // For webhook verification
      apiUrl: process.env.FLUTTERWAVE_API_URL || 'https://developersandbox-api.flutterwave.com', // v4 sandbox
      authUrl: process.env.FLUTTERWAVE_AUTH_URL || 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token',
      environment: process.env.FLUTTERWAVE_ENVIRONMENT || 'sandbox', // sandbox or production
      callbackUrl: process.env.FLUTTERWAVE_CALLBACK_URL || '',
      logoUrl: process.env.FLUTTERWAVE_LOGO_URL || '', // Optional: Your logo URL for payment page
    },
    // Legacy configs kept for backward compatibility (can be removed later)
    momo: {
      apiKey: process.env.MTN_MOMO_API_KEY || '',
      apiSecret: process.env.MTN_MOMO_API_SECRET || '',
      apiUrl: process.env.MTN_MOMO_API_URL || 'https://sandbox.momodeveloper.mtn.com',
      subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || '',
      environment: process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
      callbackUrl: process.env.MTN_MOMO_CALLBACK_URL || '',
    },
    airtel: {
      apiKey: process.env.AIRTEL_MONEY_API_KEY || '',
      apiSecret: process.env.AIRTEL_MONEY_API_SECRET || '',
      apiUrl: process.env.AIRTEL_MONEY_API_URL || '',
      clientId: process.env.AIRTEL_MONEY_CLIENT_ID || '',
      clientSecret: process.env.AIRTEL_MONEY_CLIENT_SECRET || '',
      merchantId: process.env.AIRTEL_MONEY_MERCHANT_ID || '',
      environment: process.env.AIRTEL_MONEY_ENVIRONMENT || 'sandbox',
      callbackUrl: process.env.AIRTEL_MONEY_CALLBACK_URL || '',
    },
    card: {
      apiKey: process.env.CARD_API_KEY || '',
      apiUrl: process.env.CARD_API_URL || '',
    },
  },

  whatsapp: {
    apiKey: process.env.WHATSAPP_API_KEY || '',
    apiUrl: process.env.WHATSAPP_API_URL || '',
    defaultMessage: process.env.WHATSAPP_DEFAULT_MESSAGE || 'Hello',
  },

  maps: {
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    openStreetMapEnabled: process.env.OPENSTREETMAP_ENABLED === 'true',
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  },
};
