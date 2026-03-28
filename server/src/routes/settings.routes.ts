import express from 'express';
import { getSettings, updateSettings, testSMTP, testS3, getPublicSettings, getProxmoxTemplates, getProxmoxConfig, testProxmox, getProxmoxStatus } from '../controllers/settings.controller';
import { authenticate, authorize, hasPermission, hasAnyPermission } from '../middleware/auth.middleware';

const router = express.Router();

// Public branding settings
router.get('/public', getPublicSettings);

// All settings routes require manage_settings permission
router.get('/', authenticate, hasPermission('manage_settings'), getSettings);
router.put('/', authenticate, hasPermission('manage_settings'), updateSettings);
router.post('/test-smtp', authenticate, hasPermission('manage_settings'), testSMTP);
router.post('/test-s3', authenticate, hasPermission('manage_settings'), testS3);

// Proxmox routes
router.get('/proxmox/templates', authenticate, hasAnyPermission('manage_settings', 'provision_labs'), getProxmoxTemplates);
router.get('/proxmox/config', authenticate, hasAnyPermission('manage_settings', 'provision_labs'), getProxmoxConfig);
router.get('/proxmox/status', authenticate, hasAnyPermission('manage_settings', 'provision_labs'), getProxmoxStatus);
router.post('/test-proxmox', authenticate, hasPermission('manage_settings'), testProxmox);

export default router;
