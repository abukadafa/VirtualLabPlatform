import express from 'express';
import {
    getAllLabs,
    getLabById,
    createLab,
    updateLab,
    deleteLab,
    startLab,
    stopLab,
    getLabStatus,
    getLabConnection,
    extendSession,
    getQueueStatus,
} from '../controllers/lab.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { labStartRateLimit } from '../middleware/rate-limit.middleware';
import { checkEnrollment } from '../middleware/enrollment.middleware';
import { validate } from '../middleware/validation.middleware';
import { labStartSchema } from '../schemas/security.schema';

const router = express.Router();

// Lab CRUD endpoints
router.get('/', authenticate, getAllLabs);
router.get('/:id', authenticate, getLabById);
router.post('/', authenticate, authorize('admin'), createLab);
router.put('/:id', authenticate, authorize('admin'), updateLab);
router.delete('/:id', authenticate, authorize('admin'), deleteLab);

// Session management endpoints
router.post('/:id/start', authenticate, validate(labStartSchema), checkEnrollment, labStartRateLimit, startLab);
router.post('/:id/stop', authenticate, stopLab);
router.get('/:id/status', authenticate, getLabStatus);
router.get('/:id/connection', authenticate, checkEnrollment, getLabConnection);
router.post('/:id/extend', authenticate, extendSession);
router.get('/queue/status', authenticate, getQueueStatus);

export default router;
