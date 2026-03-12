import express from 'express';
import { getStatus } from '../controllers/monitoring.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = express.Router();

// Only admins can view monitoring status
router.get('/status', authenticate, authorize('admin'), getStatus);

export default router;
