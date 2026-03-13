import axios from 'axios';
import { config } from '../config/config';
import crypto from 'crypto';

export enum PaymentChannel {
  MTN_MOMO = 'mtn_momo',
  AIRTEL_MONEY = 'airtel_money',
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money', // Generic mobile money through Flutterwave
}

export interface PaymentInitRequest {
  amount: number;
  currency: string;
  customerId: string;
  providerId?: string;
  channel: PaymentChannel;
  phoneNumber?: string; // required for mobile money
  email?: string; // for card payments / receipts
  callbackUrl?: string;
  description?: string;
}

export interface PaymentInitResponse {
  providerReference: string;
  checkoutUrl?: string; // for redirect/card flows
  status: 'pending' | 'processing' | 'failed';
}

/**
 * Payment service using Flutterwave v4 API
 * Flutterwave supports MTN Mobile Money, Airtel Money, and Card payments
 * Documentation: https://developer.flutterwave.com/docs
 */
export class PaymentService {
  private static accessTokenCache: { token: string; expiresAt: number } | null = null;

  /**
   * Generate Flutterwave OAuth access token
   * Tokens are valid for 10 minutes
   */
  private static async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > Date.now()) {
      return this.accessTokenCache.token;
    }

    // Use Client-Id and Client-Secret for v4 API, or fallback to Secret Key for v3
    const clientId = config.payments.flutterwave.clientId;
    const clientSecret = config.payments.flutterwave.clientSecret;
    const secretKey = config.payments.flutterwave.secretKey;

    if (!clientId || !clientSecret) {
      // Fallback to v3 API if Client-Id/Secret not available
      if (!secretKey) {
        throw new Error('FLUTTERWAVE_CLIENT_ID and FLUTTERWAVE_CLIENT_SECRET (or FLUTTERWAVE_SECRET_KEY) are required');
      }
      return secretKey; // v3 API uses secret key directly
    }

    try {
      const response = await axios.post(
        config.payments.flutterwave.authUrl!,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, expires_in } = response.data;
      const expiresAt = Date.now() + (expires_in * 1000) - 60000; // Expire 1 minute early

      // Cache the token
      this.accessTokenCache = {
        token: access_token,
        expiresAt,
      };

      return access_token;
    } catch (error: any) {
      console.error('[PaymentService] Flutterwave token generation error:', error.response?.data || error.message);
      throw new Error(
        `Failed to generate Flutterwave access token: ${error.response?.data?.error_description || error.message}`
      );
    }
  }

  static async initiatePayment(
    payload: PaymentInitRequest
  ): Promise<PaymentInitResponse> {
    // Flutterwave handles all payment methods through a unified API
    // Map our channels to Flutterwave payment methods
    switch (payload.channel) {
      case PaymentChannel.MTN_MOMO:
      case PaymentChannel.AIRTEL_MONEY:
      case PaymentChannel.MOBILE_MONEY:
        return this.initiateMobileMoneyPayment(payload);
      case PaymentChannel.CARD:
        return this.initiateCardPayment(payload);
      default:
        throw new Error('Unsupported payment channel');
    }
  }

  /**
   * Initiate Mobile Money payment through Flutterwave v4 API
   * Supports MTN Mobile Money, Airtel Money, and other mobile money providers
   * Documentation: https://developer.flutterwave.com/docs/mobile-money
   */
  private static async initiateMobileMoneyPayment(
    payload: PaymentInitRequest
  ): Promise<PaymentInitResponse> {
    if (!payload.phoneNumber) {
      throw new Error('phoneNumber is required for mobile money payments');
    }
    if (!payload.email) {
      throw new Error('email is required for Flutterwave payments');
    }

    try {
      // Get access token
      const accessToken = await this.getAccessToken();

      // Format phone number (remove + and spaces)
      let phoneNumber = payload.phoneNumber.replace(/[^\d]/g, '');
      // Ensure it starts with country code (Rwanda: 250)
      if (!phoneNumber.startsWith('250')) {
        phoneNumber = `250${phoneNumber}`;
      }

      // Generate unique transaction reference
      const txRef = `HANOSERVICES_${payload.customerId}_${Date.now()}`;
      const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Use callback URL from payload or config
      const callbackUrl = payload.callbackUrl || config.payments.flutterwave.callbackUrl;

      // Determine payment provider based on channel
      // For Rwanda: 'mtn' or 'airtel'
      let paymentProvider = 'mtn'; // Default to MTN
      if (payload.channel === PaymentChannel.AIRTEL_MONEY) {
        paymentProvider = 'airtel';
      }

      // Flutterwave v4 API - Mobile Money payment
      // First create a customer, then create a charge
      // Step 1: Create customer
      const customerResponse = await axios.post(
        `${config.payments.flutterwave.apiUrl}/customers`,
        {
          email: payload.email,
          phone: {
            country_code: '250',
            number: phoneNumber.substring(3), // Remove country code prefix
          },
          name: {
            first: payload.customerId.split('_')[0] || 'Customer',
            last: payload.customerId.split('_')[1] || 'User',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Trace-Id': traceId,
          },
        }
      );

      const customerId = customerResponse.data.data?.id;
      if (!customerId) {
        throw new Error('Failed to create customer');
      }

      // Step 2: Create charge using mobile money
      const chargeResponse = await axios.post(
        `${config.payments.flutterwave.apiUrl}/charges`,
        {
          reference: txRef,
          currency: payload.currency || 'RWF',
          customer_id: customerId,
          amount: payload.amount,
          payment_method: {
            type: 'mobile_money',
            mobile_money: {
              provider: paymentProvider,
              phone: {
                country_code: '250',
                number: phoneNumber.substring(3),
              },
            },
          },
          redirect_url: callbackUrl,
          meta: {
            customer_id: payload.customerId,
            provider_id: payload.providerId,
            description: payload.description || 'HanoServices payment',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Trace-Id': traceId,
          },
        }
      );

      const { status, message, data } = chargeResponse.data;

      if (status === 'success' || status === 'pending') {
        return {
          providerReference: txRef,
          status: data?.status === 'pending' ? 'pending' : 'processing',
          checkoutUrl: data?.next_action?.redirect_url?.url || undefined,
        };
      }

      throw new Error(message || 'Failed to initiate payment');
    } catch (error: any) {
      console.error('[PaymentService] Flutterwave mobile money error:', error.response?.data || error.message);
      throw new Error(
        `Failed to initiate mobile money payment: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Initiate Card payment through Flutterwave v4 API
   * Documentation: https://developer.flutterwave.com/docs/charging-a-card
   */
  private static async initiateCardPayment(
    payload: PaymentInitRequest
  ): Promise<PaymentInitResponse> {
    if (!payload.email) {
      throw new Error('email is required for card payments');
    }

    try {
      // Generate unique transaction reference
      const txRef = `HANOSERVICES_${payload.customerId}_${Date.now()}`;

      // Use callback URL from payload or config
      const callbackUrl = payload.callbackUrl || config.payments.flutterwave.callbackUrl;

      // Ensure secret key is available for v3 API
      const secretKey = config.payments.flutterwave.secretKey;
      if (!secretKey) {
        throw new Error('FLUTTERWAVE_SECRET_KEY is required for card payments via standard checkout');
      }

      // Use Flutterwave v3 standard checkout API to generate a payment link
      const response = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        {
          tx_ref: txRef,
          amount: payload.amount,
          currency: payload.currency || 'RWF',
          redirect_url: callbackUrl,
          meta: {
            customer_id: payload.customerId,
            provider_id: payload.providerId,
          },
          customer: {
            email: payload.email,
            phonenumber: payload.phoneNumber || undefined,
            name: `${payload.customerId.split('_')[0]} ${payload.customerId.split('_')[1] || ''}`.trim() || 'Customer',
          },
          customizations: {
            title: 'HanoServices',
            description: payload.description || 'Payment for services',
            logo: config.payments.flutterwave.logoUrl || 'https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-online-shop-log.jpg',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { status, message, data } = response.data;

      if (status === 'success') {
        return {
          providerReference: txRef,
          status: 'pending',
          checkoutUrl: data.link, // Real Flutterwave hosted payment page URL
        };
      }

      throw new Error(message || 'Failed to generate payment link');
    } catch (error: any) {
      console.error('[PaymentService] Flutterwave card payment error:', error.response?.data || error.message);
      throw new Error(
        `Failed to initiate card payment: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Verify Flutterwave webhook signature
   * Flutterwave v4 sends a hash in the 'verif-hash' header
   * Documentation: https://developer.flutterwave.com/docs/webhooks
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    if (!config.payments.flutterwave.secretHash) {
      console.warn('[PaymentService] FLUTTERWAVE_SECRET_HASH not set, skipping signature verification');
      return true; // Allow if not configured (for development)
    }

    // Flutterwave uses SHA512 HMAC with the secret hash
    const hash = crypto
      .createHmac('sha512', config.payments.flutterwave.secretHash)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }
}

