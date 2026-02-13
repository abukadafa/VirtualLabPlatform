import express from 'express';
import { getSettings, updateSettings, testSMTP, testS3 } from '../controllers/settings.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = express.Router();

// All settings routes require admin authentication
router.get('/', authenticate, authorize('admin'), getSettings);
router.put('/', authenticate, authorize('admin'), updateSettings);
router.post('/test-smtp', authenticate, authorize('admin'), testSMTP);
router.post('/test-s3', authenticate, authorize('admin'), testS3);

export default router;
