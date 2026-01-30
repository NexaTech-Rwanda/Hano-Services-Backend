import axios from 'axios';
import { config } from '../config/config';

export enum PaymentChannel {
  MTN_MOMO = 'mtn_momo',
  AIRTEL_MONEY = 'airtel_money',
  CARD = 'card',
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
 * NOTE: This is a provider-agnostic scaffold.
 * You still need to plug in a real PSP (e.g. MTN MoMo API, Airtel Money API,
 * or an aggregator like Flutterwave/Paystack/Stripe) and map their fields
 * into this abstraction.
 */
export class PaymentService {
  static async initiatePayment(
    payload: PaymentInitRequest
  ): Promise<PaymentInitResponse> {
    switch (payload.channel) {
      case PaymentChannel.MTN_MOMO:
        return this.initiateMomoPayment(payload);
      case PaymentChannel.AIRTEL_MONEY:
        return this.initiateAirtelPayment(payload);
      case PaymentChannel.CARD:
        return this.initiateCardPayment(payload);
      default:
        throw new Error('Unsupported payment channel');
    }
  }

  /**
   * Generate MTN MoMo access token
   * MTN uses OAuth 2.0 - you need to get a token first using API Key and Secret
   */
  private static async getMtnAccessToken(): Promise<string> {
    if (!config.payments.momo.apiKey || !config.payments.momo.apiSecret) {
      throw new Error('MTN_MOMO_API_KEY and MTN_MOMO_API_SECRET are required');
    }
    if (!config.payments.momo.subscriptionKey) {
      throw new Error('MTN_MOMO_SUBSCRIPTION_KEY is required');
    }

    try {
      // Create Basic Auth header: base64(apiKey:apiSecret)
      const credentials = Buffer.from(
        `${config.payments.momo.apiKey}:${config.payments.momo.apiSecret}`
      ).toString('base64');

      const response = await axios.post(
        `${config.payments.momo.apiUrl}/collection/token/`,
        {},
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Ocp-Apim-Subscription-Key': config.payments.momo.subscriptionKey,
          },
        }
      );

      return response.data.access_token;
    } catch (error: any) {
      console.error('[PaymentService] MTN token generation error:', error.response?.data || error.message);
      throw new Error(
        `Failed to generate MTN access token: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Initiate MTN Mobile Money payment
   * Based on MTN MoMo API documentation: https://momodeveloper.mtn.com/api-documentation
   */
  private static async initiateMomoPayment(
    payload: PaymentInitRequest
  ): Promise<PaymentInitResponse> {
    if (!config.payments.momo.apiUrl) {
      throw new Error('MTN_MOMO_API_URL is required');
    }
    if (!config.payments.momo.subscriptionKey) {
      throw new Error('MTN_MOMO_SUBSCRIPTION_KEY is required');
    }
    if (!payload.phoneNumber) {
      throw new Error('phoneNumber is required for MTN MoMo payments');
    }

    try {
      // Step 1: Get access token
      const accessToken = await this.getMtnAccessToken();

      // Step 2: Format phone number (remove + and spaces)
      const phoneNumber = payload.phoneNumber.replace(/[^\d]/g, '');
      
      // Step 3: Generate unique external ID for this transaction
      const externalId = `HANOSERVICES_${payload.customerId}_${Date.now()}`;
      
      // Step 4: Use callback URL from payload or config
      const callbackUrl = payload.callbackUrl || config.payments.momo.callbackUrl;
      if (!callbackUrl) {
        throw new Error('Callback URL is required. Set MTN_MOMO_CALLBACK_URL or provide in request.');
      }

      // Step 5: MTN MoMo API request to initiate payment
      // Endpoint: POST /collection/v1_0/requesttopay
      const response = await axios.post(
        `${config.payments.momo.apiUrl}/collection/v1_0/requesttopay`,
        {
          amount: payload.amount.toString(),
          currency: payload.currency || 'RWF',
          externalId: externalId,
          payer: {
            partyIdType: 'MSISDN',
            partyId: phoneNumber,
          },
          payerMessage: payload.description || 'HanoServices payment',
          payeeNote: `Payment for ${payload.description || 'service'}`,
        },
        {
          headers: {
            'X-Target-Environment': config.payments.momo.environment,
            'X-Callback-Url': callbackUrl,
            'Ocp-Apim-Subscription-Key': config.payments.momo.subscriptionKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Reference-Id': externalId,
          },
        }
      );

      return {
        providerReference: externalId,
        status: 'pending',
      };
    } catch (error: any) {
      console.error('[PaymentService] MTN MoMo payment error:', error.response?.data || error.message);
      throw new Error(
        `Failed to initiate MTN MoMo payment: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Initiate Airtel Money payment
   * Note: This implementation follows common Airtel Money API patterns.
   * Adjust endpoints and request format based on your Airtel API documentation.
   */
  private static async initiateAirtelPayment(
    payload: PaymentInitRequest
  ): Promise<PaymentInitResponse> {
    if (!config.payments.airtel.apiUrl || !config.payments.airtel.clientId) {
      throw new Error(
        'Airtel Money is not configured. Set AIRTEL_MONEY_API_URL and AIRTEL_MONEY_CLIENT_ID.'
      );
    }
    if (!config.payments.airtel.clientSecret) {
      throw new Error('AIRTEL_MONEY_CLIENT_SECRET is required');
    }
    if (!payload.phoneNumber) {
      throw new Error('phoneNumber is required for Airtel Money payments');
    }

    try {
      // Format phone number (remove + and spaces, ensure it starts with country code)
      let phoneNumber = payload.phoneNumber.replace(/[^\d]/g, '');
      // If phone doesn't start with country code, assume Rwanda (250)
      if (!phoneNumber.startsWith('250')) {
        phoneNumber = `250${phoneNumber}`;
      }

      // Generate unique transaction reference
      const transactionRef = `HANOSERVICES_${payload.customerId}_${Date.now()}`;
      
      // Use callback URL from payload or config
      const callbackUrl = payload.callbackUrl || config.payments.airtel.callbackUrl;

      // Step 1: Get access token using OAuth 2.0
      // Airtel requires OAuth token - generate it using Client ID and Secret
      let accessToken = config.payments.airtel.apiKey;
      
      // If API Key is not set or you want to generate fresh token, use OAuth
      if (!accessToken || config.payments.airtel.clientId) {
        try {
          const tokenResponse = await axios.post(
            `${config.payments.airtel.apiUrl}/auth/oauth2/token`,
            new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: config.payments.airtel.clientId,
              client_secret: config.payments.airtel.clientSecret,
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          );
          accessToken = tokenResponse.data.access_token;
        } catch (tokenError: any) {
          console.warn('[PaymentService] Failed to generate Airtel token, using provided API key:', tokenError.message);
          // Fall back to provided API key if token generation fails
          if (!accessToken) {
            throw new Error('Failed to get Airtel access token and no API key provided');
          }
        }
      }

      // Step 2: Initiate payment
      // Adjust endpoint path based on your Airtel API version
      const response = await axios.post(
        `${config.payments.airtel.apiUrl}/merchant/v1/payments`,
        {
          amount: payload.amount,
          currency: payload.currency || 'RWF',
          reference: transactionRef,
          transactionId: transactionRef,
          msisdn: phoneNumber,
          description: payload.description || 'HanoServices payment',
          callbackUrl: callbackUrl,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'X-Country': 'RW', // Rwanda country code
            'X-Currency': payload.currency || 'RWF',
          },
        }
      );

      return {
        providerReference: transactionRef,
        status: 'pending',
      };
    } catch (error: any) {
      console.error('[PaymentService] Airtel Money payment error:', error.response?.data || error.message);
      throw new Error(
        `Failed to initiate Airtel Money payment: ${error.response?.data?.message || error.message}`
      );
    }
  }

  private static async initiateCardPayment(
    payload: PaymentInitRequest
  ): Promise<PaymentInitResponse> {
    if (!config.payments.card?.apiKey || !config.payments.card?.apiUrl) {
      throw new Error(
        'Card payments are not configured. Set CARD_API_URL and CARD_API_KEY.'
      );
    }

    // TODO: Replace with actual card PSP API call (e.g. Flutterwave/Stripe/etc.)
    const response = await axios.post(
      `${config.payments.card.apiUrl}/placeholder-card-endpoint`,
      {
        amount: payload.amount,
        currency: payload.currency,
        email: payload.email,
        description: payload.description ?? 'HanoServices card payment',
        callbackUrl: payload.callbackUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${config.payments.card.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      providerReference: response.data.reference ?? 'card-ref-placeholder',
      status: 'pending',
      checkoutUrl: response.data.checkout_url,
    };
  }
}

