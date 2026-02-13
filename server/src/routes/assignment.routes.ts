import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getAssignmentsByLab, createAssignment, getAllAssignments } from '../controllers/assignment.controller';

const router = express.Router();

router.get('/lab/all', authenticate, getAllAssignments);
router.get('/lab/:labId', authenticate, getAssignmentsByLab);
router.post('/', authenticate, authorize('admin'), createAssignment);

export default router;
