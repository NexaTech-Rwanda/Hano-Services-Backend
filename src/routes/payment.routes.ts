import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { body } from 'express-validator';
import { PaymentChannel } from '../services/payment.service';

const router = Router();

/**
 * @swagger
 * /api/payments/initiate:
 *   post:
 *     summary: Initiate a payment
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *               - customerId
 *               - channel
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1000
 *               currency:
 *                 type: string
 *                 example: RWF
 *               customerId:
 *                 type: string
 *               channel:
 *                 type: string
 *                 enum: [mtn_momo, airtel_money, mobile_money, card]
 *               phoneNumber:
 *                 type: string
 *                 example: "+250788123456"
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment initiated successfully
 */
router.post(
  '/initiate',
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('currency').isString().notEmpty().withMessage('Currency is required'),
    body('customerId').isString().notEmpty().withMessage('Customer ID is required'),
    body('channel')
      .isIn(Object.values(PaymentChannel))
      .withMessage(`Channel must be one of: ${Object.values(PaymentChannel).join(', ')}`),
    body('phoneNumber')
      .optional()
      .isString()
      .withMessage('Phone number must be a string'),
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
  ],
  PaymentController.initiatePayment
);

/**
 * @swagger
 * /api/payments/flutterwave/callback:
 *   post:
 *     summary: Flutterwave webhook callback
 *     tags: [Payments]
 *     description: This endpoint receives payment status updates from Flutterwave for all payment types
 *     responses:
 *       200:
 *         description: Webhook received
 *       401:
 *         description: Invalid signature
 */
router.post('/flutterwave/callback', PaymentController.flutterwaveCallback);

/**
 * @swagger
 * /api/payments/mtn/callback:
 *   post:
 *     summary: MTN Mobile Money webhook callback (deprecated)
 *     tags: [Payments]
 *     description: Deprecated - Use /api/payments/flutterwave/callback instead
 *     responses:
 *       200:
 *         description: Callback received
 * @deprecated
 */
router.post('/mtn/callback', PaymentController.mtnCallback);

/**
 * @swagger
 * /api/payments/airtel/callback:
 *   post:
 *     summary: Airtel Money webhook callback (deprecated)
 *     tags: [Payments]
 *     description: Deprecated - Use /api/payments/flutterwave/callback instead
 *     responses:
 *       200:
 *         description: Callback received
 * @deprecated
 */
router.post('/airtel/callback', PaymentController.airtelCallback);

/**
 * @swagger
 * /api/payments/{reference}/status:
 *   get:
 *     summary: Get payment status
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status
 */
router.get('/:reference/status', PaymentController.getPaymentStatus);

export default router;
