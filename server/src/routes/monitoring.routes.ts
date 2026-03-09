import express from 'express';
import { getServerHealth, getSystemLogs, getQuickStats, analyzeLogsWithAI, analyzeUserActivityWithAI } from '../controllers/monitoring.controller';
import { authenticate, hasPermission } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/health', authenticate, hasPermission('manage_settings'), getServerHealth);
router.get('/logs', authenticate, hasPermission('manage_settings'), getSystemLogs);
router.get('/stats', authenticate, hasPermission('manage_settings'), getQuickStats);
router.post('/analyze-logs-ai', authenticate, hasPermission('manage_settings'), analyzeLogsWithAI);
router.post('/analyze-user-ai/:userId', authenticate, hasPermission('manage_users'), analyzeUserActivityWithAI);

export default router;
