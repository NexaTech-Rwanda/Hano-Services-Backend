import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

router.post('/register', AuthController.register);
router.post('/send-otp', AuthController.sendOTP);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/login', AuthController.login);
router.post('/login-otp', AuthController.loginWithOTP);
router.post('/reset-password', AuthController.resetPassword);

export default router;
