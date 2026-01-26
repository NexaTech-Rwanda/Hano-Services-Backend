import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public: list reviews for a provider
router.get('/provider/:providerId', ReviewController.listForProvider);

// Authenticated customer: create review
router.post('/', authenticate, ReviewController.create);

// Authenticated user (customer/provider): get own-related review
router.get('/:id', authenticate, ReviewController.getByIdForUser);

export default router;

