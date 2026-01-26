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

  private static async initiateMomoPayment(
    payload: PaymentInitRequest
  ): Promise<PaymentInitResponse> {
    if (!config.payments.momo.apiUrl || !config.payments.momo.apiKey) {
      throw new Error(
        'MoMo payment is not configured. Set MOMO_API_URL and MOMO_API_KEY.'
      );
    }
    if (!payload.phoneNumber) {
      throw new Error('phoneNumber is required for MTN MoMo payments');
    }

    // TODO: Replace with actual MoMo API call.
    // This is just a placeholder to show where integration goes.
    const response = await axios.post(
      `${config.payments.momo.apiUrl}/placeholder-endpoint`,
      {
        amount: payload.amount,
        currency: payload.currency,
        msisdn: payload.phoneNumber,
        externalId: payload.customerId,
        description: payload.description ?? 'HanoServices payment',
        callbackUrl: payload.callbackUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${config.payments.momo.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Map PSP response into our abstraction
    return {
      providerReference: response.data.reference ?? 'momo-ref-placeholder',
      status: 'pending',
      checkoutUrl: response.data.checkout_url,
    };
  }

  private static async initiateAirtelPayment(
    payload: PaymentInitRequest
  ): Promise<PaymentInitResponse> {
    if (!config.payments.airtel.apiKey) {
      throw new Error('Airtel Money is not configured. Set AIRTEL_MONEY_API_KEY.');
    }
    if (!payload.phoneNumber) {
      throw new Error('phoneNumber is required for Airtel Money payments');
    }

    // TODO: Replace with actual Airtel Money API call.
    return {
      providerReference: 'airtel-ref-placeholder',
      status: 'pending',
    };
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

