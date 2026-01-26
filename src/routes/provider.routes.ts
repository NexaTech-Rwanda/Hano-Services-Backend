import { Router } from 'express';
import { ProviderController } from '../controllers/provider.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

// Public routes
router.get('/search', ProviderController.search);
router.get('/:id', ProviderController.getById);
router.get('/:id/portfolio', ProviderController.getPortfolio);

// Protected routes (Provider only)
router.post('/', authenticate, authorize(UserRole.PROVIDER), ProviderController.create);
router.get('/me/profile', authenticate, authorize(UserRole.PROVIDER), ProviderController.getMyProfile);
router.put('/:id', authenticate, authorize(UserRole.PROVIDER), ProviderController.update);
router.patch('/:id/availability', authenticate, authorize(UserRole.PROVIDER), ProviderController.updateAvailability);
router.post('/:id/portfolio', authenticate, authorize(UserRole.PROVIDER), ProviderController.addPortfolioImage);
router.delete('/:id/portfolio/:portfolioId', authenticate, authorize(UserRole.PROVIDER), ProviderController.deletePortfolioImage);
router.post('/:id/verification', authenticate, authorize(UserRole.PROVIDER), ProviderController.submitVerification);
router.get('/:id/verification', authenticate, authorize(UserRole.PROVIDER), ProviderController.getVerificationRequest);

export default router;
