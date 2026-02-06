import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/config';
import pool from './config/database';
import { swaggerSpec } from './config/swagger';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Capture raw JSON body so we can verify Flutterwave webhook signatures
app.use(express.json({
  verify: (req: any, _res, buf) => {
    // Save raw body as string for HMAC verification (e.g., Flutterwave webhooks)
    (req as any).rawBody = buf.toString('utf8');
  },
}));

app.use(express.urlencoded({ extended: true }));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running and database is connected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 message:
 *                   type: string
 *                   example: "HanoServices API is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Database connection failed
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
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({
      status: 'ok',
      message: 'HanoServices API is running',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "HanoServices API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */
app.get('/api', (_req: Request, res: Response) => {
  return res.json({
    message: 'HanoServices API',
    version: '1.0.0',
  });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'HanoServices API Documentation',
}));

// Import routes
import authRoutes from './routes/auth.routes';
import categoriesRoutes from './routes/categories.routes';
import providersRoutes from './routes/provider.routes';
import adminRoutes from './routes/admin.routes';
import reviewsRoutes from './routes/review.routes';
import paymentRoutes from './routes/payment.routes';
import userRoutes from './routes/user.routes';
import jobRoutes from './routes/job.routes';
import bookingRoutes from './routes/booking.routes';

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/providers', providersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/bookings', bookingRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  return res.status(500).json({
    status: 'error',
    message: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  return res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
});

export default app;
