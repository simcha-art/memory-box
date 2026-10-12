import { Router } from 'express';
import {
  forgotPassword,
  login,
  me,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter, emailLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-verification', emailLimiter, resendVerification);
router.post('/forgot-password', emailLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/me', authenticate, me);

export default router;