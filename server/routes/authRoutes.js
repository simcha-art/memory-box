import { Router } from 'express';
import { login, me, register, resendVerification, verifyEmail } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/me', authenticate, me);

export default router;