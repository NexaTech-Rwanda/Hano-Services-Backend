import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { upload } from '../middleware/upload';

const router = Router();

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a booking request (customer only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - serviceCategoryId
 *             properties:
 *               providerId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               serviceCategoryId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-02-10T10:00:00Z"
 *               description:
 *                 type: string
 *                 example: "Need help fixing kitchen sink leak"
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: -1.9441
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: 30.0619
 *               address:
 *                 type: string
 *                 example: "Kigali, Rwanda"
 *               notes:
 *                 type: string
 *                 example: "Please bring necessary tools"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "Optional booking image (JPEG, JPG, PNG)"
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - serviceCategoryId
 *             properties:
 *               providerId:
 *                 type: string
 *                 format: uuid
 *               serviceCategoryId:
 *                 type: string
 *                 format: uuid
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *               description:
 *                 type: string
 *               latitude:
 *                 type: number
 *                 format: float
 *               longitude:
 *                 type: number
 *                 format: float
 *               address:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Forbidden (not a customer)
 */
router.post('/', upload.single('image'), ...BookingController.create);

/**
 * @swagger
 * /api/bookings/my:
 *   get:
 *     summary: Get current user's (customer) bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, declined, completed, cancelled]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *     responses:
 *       200:
 *         description: List of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Forbidden (not a customer)
 */
router.get('/my', ...BookingController.getMyBookings);

/**
 * @swagger
 * /api/bookings/provider:
 *   get:
 *     summary: Get current user's (provider) bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, declined, completed, cancelled]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *     responses:
 *       200:
 *         description: List of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Forbidden (not a provider)
 */
router.get('/provider', ...BookingController.getProviderBookings);

/**
 * @swagger
 * /api/bookings/{id}/accept:
 *   patch:
 *     summary: Accept a booking (provider only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Forbidden (not assigned provider)
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         description: Booking is not in a pending state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Booking is not in a pending state"
 */
router.patch('/:id/accept', ...BookingController.accept);

/**
 * @swagger
 * /api/bookings/{id}/decline:
 *   patch:
 *     summary: Decline a booking (provider only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking declined
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Forbidden (not assigned provider)
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         description: Booking is not in a pending state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Booking is not in a pending state"
 */
router.patch('/:id/decline', ...BookingController.decline);

/**
 * @swagger
 * /api/bookings/{id}/chat:
 *   get:
 *     summary: Get chat messages for a booking (removed – WhatsApp only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *     responses:
 *       410:
 *         description: Chat functionality removed. Use WhatsApp via /api/bookings/:id/whatsapp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Chat functionality removed. Use WhatsApp via /api/bookings/:id/whatsapp"
 */
router.get('/:id/chat', ...BookingController.getChat);

/**
 * @swagger
 * /api/bookings/{id}/chat:
 *   post:
 *     summary: Send a chat message in a booking (removed – WhatsApp only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Is 10 AM okay?"
 *     responses:
 *       410:
 *         description: Chat functionality removed. Use WhatsApp via /api/bookings/:id/whatsapp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Chat functionality removed. Use WhatsApp via /api/bookings/:id/whatsapp"
 */
router.post('/:id/chat', ...BookingController.sendMessage);

/**
 * @swagger
 * /api/bookings/{id}/whatsapp:
 *   get:
 *     summary: Open WhatsApp chat for a booking
 *     description: Returns a WhatsApp deep link to open a chat with the other party. Only participants (customer or provider) can use this.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: WhatsApp deep link generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     whatsappLink:
 *                       type: string
 *                       example: "https://wa.me/250788123456?text=Hello!%20I%20have%20a%20question%20about%20our%20booking..."
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Forbidden (not part of this booking)
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         description: Could not retrieve contact number
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Could not retrieve contact number"
 */
router.get('/:id/whatsapp', ...BookingController.openWhatsApp);

export default router;
