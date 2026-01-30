import { Request, Response } from 'express';
import { PaymentService, PaymentChannel } from '../services/payment.service';

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
        return res.status(400).json({
          error: 'Missing required fields: amount, currency, customerId, channel',
        });
      }

      // Validate channel
      if (!Object.values(PaymentChannel).includes(channel)) {
        return res.status(400).json({
          error: `Invalid payment channel. Must be one of: ${Object.values(PaymentChannel).join(', ')}`,
        });
      }

      // Validate phone number for mobile money
      if (
        (channel === PaymentChannel.MTN_MOMO ||
          channel === PaymentChannel.AIRTEL_MONEY) &&
        !phoneNumber
      ) {
        return res.status(400).json({
          error: 'phoneNumber is required for mobile money payments',
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

      return res.status(201).json({
        message: 'Payment initiated successfully',
        data: paymentResponse,
      });
    } catch (error: any) {
      console.error('[PaymentController] Error initiating payment:', error);
      return res.status(500).json({
        error: error.message || 'Failed to initiate payment',
      });
    }
  }

  /**
   * MTN Mobile Money webhook/callback handler
   * POST /api/payments/mtn/callback
   */
  static async mtnCallback(req: Request, res: Response): Promise<Response> {
    try {
      const callbackData = req.body;

      console.log('[PaymentController] MTN Callback received:', JSON.stringify(callbackData, null, 2));

      // MTN callback structure (adjust based on actual MTN API response)
      const {
        externalId,
        financialTransactionId,
        status,
        amount,
        currency,
        payer,
        reason,
      } = callbackData;

      // TODO: Update your database with payment status
      // Example:
      // await PaymentModel.updateStatus(externalId, status, {
      //   financialTransactionId,
      //   amount,
      //   currency,
      //   payer,
      //   reason,
      // });

      // Always respond with 200 OK quickly (within 5 seconds)
      // MTN will retry if you don't respond or respond with error
      return res.status(200).json({
        message: 'Callback received',
        received: true,
      });
    } catch (error: any) {
      console.error('[PaymentController] Error processing MTN callback:', error);
      // Still return 200 to prevent retries
      return res.status(200).json({
        message: 'Callback received but processing failed',
        error: error.message,
      });
    }
  }

  /**
   * Airtel Money webhook/callback handler
   * POST /api/payments/airtel/callback
   */
  static async airtelCallback(req: Request, res: Response): Promise<Response> {
    try {
      const callbackData = req.body;

      console.log('[PaymentController] Airtel Callback received:', JSON.stringify(callbackData, null, 2));

      // Airtel callback structure (adjust based on actual Airtel API response)
      const {
        transactionId,
        reference,
        status,
        amount,
        currency,
        msisdn,
        message,
        responseCode,
      } = callbackData;

      // TODO: Update your database with payment status
      // Example:
      // await PaymentModel.updateStatus(reference || transactionId, status, {
      //   transactionId,
      //   amount,
      //   currency,
      //   msisdn,
      //   message,
      //   responseCode,
      // });

      // Always respond with 200 OK quickly (within 5 seconds)
      return res.status(200).json({
        message: 'Callback received',
        received: true,
      });
    } catch (error: any) {
      console.error('[PaymentController] Error processing Airtel callback:', error);
      // Still return 200 to prevent retries
      return res.status(200).json({
        message: 'Callback received but processing failed',
        error: error.message,
      });
    }
  }

  /**
   * Get payment status
   * GET /api/payments/:reference/status
   */
  static async getPaymentStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { reference } = req.params;

      // TODO: Fetch payment status from database
      // const payment = await PaymentModel.findByReference(reference);
      // if (!payment) {
      //   return res.status(404).json({ error: 'Payment not found' });
      // }

      // For now, return placeholder
      return res.status(200).json({
        message: 'Payment status endpoint - implement database lookup',
        reference,
        // status: payment.status,
        // data: payment,
      });
    } catch (error: any) {
      console.error('[PaymentController] Error getting payment status:', error);
      return res.status(500).json({
        error: error.message || 'Failed to get payment status',
      });
    }
  }
}
