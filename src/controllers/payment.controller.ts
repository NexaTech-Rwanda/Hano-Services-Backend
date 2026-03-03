import { Request, Response } from 'express';
import { PaymentService, PaymentChannel } from '../services/payment.service';
import { PaymentModel } from '../models/Payment';
import { logError } from '../utils/logger';

export class PaymentController {
  /**
   * Initiate a payment
   * POST /api/payments/initiate
   */
  static async initiatePayment(req: Request, res: Response): Promise<Response> {
    try {
      const {
        amount,
        currency,
        customerId,
        providerId,
        channel,
        phoneNumber,
        email,
        description,
      } = req.body;

      // Validate required fields
      if (!amount || !currency || !customerId || !channel) {
        logError('Missing required fields: amount, currency, customerId, channel', 'PaymentController.initiatePayment');
        return res.status(400).json({
          error: 'Missing required fields: amount, currency, customerId, channel',
        });
      }

      // Validate channel
      if (!Object.values(PaymentChannel).includes(channel)) {
        logError('Invalid payment channel', 'PaymentController.initiatePayment');
        return res.status(400).json({
          error: `Invalid payment channel. Must be one of: ${Object.values(PaymentChannel).join(', ')}`,
        });
      }

      // Validate phone number for mobile money
      if (
        (channel === PaymentChannel.MTN_MOMO ||
          channel === PaymentChannel.AIRTEL_MONEY ||
          channel === PaymentChannel.MOBILE_MONEY) &&
        !phoneNumber
      ) {
        logError('Phone number is required for mobile money payments', 'PaymentController.initiatePayment');
        return res.status(400).json({
          error: 'phoneNumber is required for mobile money payments',
        });
      }

      // Validate email for Flutterwave (required for all payment types)
      if (!email) {
        logError('Email is required for payments', 'PaymentController.initiatePayment');
        return res.status(400).json({
          error: 'email is required for payments',
        });
      }

      const paymentResponse = await PaymentService.initiatePayment({
        amount,
        currency,
        customerId,
        providerId,
        channel,
        phoneNumber,
        email,
        description,
        callbackUrl: req.body.callbackUrl, // Optional custom callback URL
      });

      // Record payment in database
      await PaymentModel.create({
        reference: (paymentResponse as any).txRef || (paymentResponse as any).reference || 'PENDING-' + Date.now(),
        customerId,
        providerId,
        amount,
        currency,
        metadata: { channel, phoneNumber, description },
      }).catch(err => logError(err.message, 'PaymentController.initiatePayment'));

      return res.status(201).json({
        message: 'Payment initiated successfully',
        data: paymentResponse,
      });
    } catch (error: any) {
      logError(error.message, 'PaymentController.initiatePayment');
      return res.status(500).json({
        error: error.message || 'Failed to initiate payment',
      });
    }
  }

  /**
   * Flutterwave webhook/callback handler
   * POST /api/payments/flutterwave/callback
   * Flutterwave sends webhooks for all payment types (mobile money, card, etc.)
   * Documentation: https://developer.flutterwave.com/docs/events
   */
  static async flutterwaveCallback(req: Request, res: Response): Promise<Response> {
    try {
      // Get the signature from header for verification
      const signature = req.headers['verif-hash'] as string;
      // Use the raw body captured by the global JSON middleware, fallback to re-stringified body
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      // Verify webhook signature
      const isValid = PaymentService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        logError('Invalid Flutterwave webhook signature', 'PaymentController.flutterwaveCallback');
        return res.status(401).json({
          error: 'Invalid signature',
        });
      }

      const event = req.body;
      logError(event, 'PaymentController.flutterwaveCallback');

      // Flutterwave v4 webhook structure
      const {
        type: eventType, // e.g., 'charge.completed', 'charge.failed'
        data,
      } = event;

      // Extract payment information from Flutterwave v4 webhook
      const {
        reference, // Transaction reference (our txRef)
      } = data || {};

      // Handle different event types
      switch (eventType) {
        case 'charge.completed':
          // Payment was successful
          await PaymentModel.updateStatus(reference, 'successful', {
            chargeId: data.id,
            flw_ref: data.flw_ref,
            amount: data.amount,
            currency: data.currency,
            customer: data.customer,
            payment_type: data.payment_type,
            completedAt: new Date(),
          });
          logError(reference, 'PaymentController.flutterwaveCallback');
          break;

        case 'charge.failed':
          // Payment failed
          await PaymentModel.updateStatus(reference, 'failed', {
            chargeId: data.id,
            flw_ref: data.flw_ref,
            amount: data.amount,
            currency: data.currency,
            failedAt: new Date(),
          });
          logError(reference, 'PaymentController.flutterwaveCallback');
          break;

        default:
          logError(eventType, 'PaymentController.flutterwaveCallback');
      }

      // Always respond with 200 OK quickly
      // Flutterwave will retry if you don't respond or respond with error
      return res.status(200).json({
        message: 'Webhook received',
        received: true,
      });
    } catch (error: any) {
      logError(error.message, 'PaymentController.flutterwaveCallback');
      // Still return 200 to prevent retries
      return res.status(200).json({
        message: 'Webhook received but processing failed',
        error: error.message,
      });
    }
  }

  /**
   * Legacy MTN callback (kept for backward compatibility)
   * @deprecated Use flutterwaveCallback instead
   */
  static async mtnCallback(_req: Request, res: Response): Promise<Response> {
    logError('MTN callback is deprecated. Use Flutterwave webhook instead.', 'PaymentController.mtnCallback');
    return res.status(200).json({
      message: 'Deprecated endpoint. Use /api/payments/flutterwave/callback',
    });
  }

  /**
   * Legacy Airtel callback (kept for backward compatibility)
   * @deprecated Use flutterwaveCallback instead
   */
  static async airtelCallback(_req: Request, res: Response): Promise<Response> {
    logError('Airtel callback is deprecated. Use Flutterwave webhook instead.', 'PaymentController.airtelCallback');
    return res.status(200).json({
      message: 'Deprecated endpoint. Use /api/payments/flutterwave/callback',
    });
  }

  /**
   * Get payment status
   * GET /api/payments/:reference/status
   */
  static async getPaymentStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { reference } = req.params;

      const payment = await PaymentModel.findByReference(reference);
      if (!payment) {
        logError('Payment not found', 'PaymentController.getPaymentStatus');
        return res.status(404).json({ error: 'Payment not found' });
      }

      return res.status(200).json({
        status: 'success',
        data: payment,
      });
    } catch (error: any) {
      logError(error.message, 'PaymentController.getPaymentStatus');
      return res.status(500).json({
        error: error.message || 'Failed to get payment status',
      });
    }
  }
}
