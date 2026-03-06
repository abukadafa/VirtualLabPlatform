import express from 'express';
import { authenticate, authorize, hasPermission } from '../middleware/auth.middleware';
import { getAssignmentsByLab, createAssignment, getAllAssignments } from '../controllers/assignment.controller';

const router = express.Router();

router.get('/lab/all', authenticate, getAllAssignments);
router.get('/lab/:labId', authenticate, getAssignmentsByLab);
router.post('/', authenticate, hasPermission('manage_labs'), createAssignment);

export default router;
