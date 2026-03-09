import express from 'express';
import { login, register, getMe, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/rate-limit.middleware';

const router = express.Router();

router.post('/register', authenticate, register);
router.post('/login', authRateLimit, login);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', authRateLimit, forgotPassword);
router.post('/reset-password/:token', authRateLimit, resetPassword);


export default router;
