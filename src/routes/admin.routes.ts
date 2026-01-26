import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

// Dashboard summary
router.get('/dashboard/summary', AdminController.getDashboardSummary);

// Users / providers / bookings management (read-only for now)
router.get('/users', AdminController.listUsers);
router.get('/providers', AdminController.listProviders);
router.get('/bookings', AdminController.listBookings);

// Verification management
router.get('/verification-requests', AdminController.getVerificationRequests);
router.get('/verification-requests/:id', AdminController.getVerificationRequest);
router.patch('/verification-requests/:id', AdminController.reviewVerificationRequest);

// Reviews management
router.delete('/reviews/:id', AdminController.deleteReview);

export default router;
