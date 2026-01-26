import dotenv from 'dotenv';

dotenv.config();

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
    password: process.env.DB_PASSWORD || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
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

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    smsFrom: process.env.TWILIO_SMS_FROM || '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || '',
  },

  payments: {
    momo: {
      apiKey: process.env.MOMO_API_KEY || '',
      apiUrl: process.env.MOMO_API_URL || '',
    },
    airtel: {
      apiKey: process.env.AIRTEL_MONEY_API_KEY || '',
    },
    card: {
      apiKey: process.env.CARD_API_KEY || '',
      apiUrl: process.env.CARD_API_URL || '',
    },
  },

  whatsapp: {
    apiKey: process.env.WHATSAPP_API_KEY || '',
    apiUrl: process.env.WHATSAPP_API_URL || '',
  },

  maps: {
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    openStreetMapEnabled: process.env.OPENSTREETMAP_ENABLED === 'true',
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  },
};
