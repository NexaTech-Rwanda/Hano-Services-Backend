import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { UserController } from '../controllers/user.controller';

const router = Router();

router.post('/location', authenticate, UserController.trackLocation);

export default router;
