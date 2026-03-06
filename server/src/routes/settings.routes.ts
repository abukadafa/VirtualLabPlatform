import express from 'express';
import { getSettings, updateSettings, testSMTP, testS3, getPublicSettings } from '../controllers/settings.controller';
import { authenticate, authorize, hasPermission } from '../middleware/auth.middleware';

const router = express.Router();

// Public branding settings
router.get('/public', getPublicSettings);

// All settings routes require manage_settings permission
router.get('/', authenticate, hasPermission('manage_settings'), getSettings);
router.put('/', authenticate, hasPermission('manage_settings'), updateSettings);
router.post('/test-smtp', authenticate, hasPermission('manage_settings'), testSMTP);
router.post('/test-s3', authenticate, hasPermission('manage_settings'), testS3);

export default router;
