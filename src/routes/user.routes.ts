import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { UserController } from '../controllers/user.controller';
import { upload } from '../middleware/upload';

const router = Router();

// Get current user profile
router.get('/profile', authenticate, UserController.getProfile);

// Update basic user profile
router.patch('/profile', authenticate, UserController.updateProfile);

// Change password
router.patch('/password', authenticate, UserController.changePassword);

// Update preferred contact method
router.patch('/contact-method', authenticate, UserController.updateContactMethod);

// Upload profile photo
router.post('/photo', authenticate, upload.single('photo'), UserController.uploadPhoto);

// Update provider-specific profile
router.patch('/provider-profile', authenticate, UserController.updateProviderProfile);

// Track user location
router.post('/location', authenticate, UserController.trackLocation);

// Update notification preferences
router.patch('/preferences', authenticate, UserController.updatePreferences);

export default router;
