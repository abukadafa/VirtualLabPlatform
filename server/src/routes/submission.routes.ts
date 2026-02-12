import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
    submitWork,
    getSubmissions,
    postResult,
    getMyResults,
    getAnalytics
} from '../controllers/submission.controller';

const router = express.Router();

// Student submits work
router.post('/submit', authenticate, submitWork);

// Student views their graded results
router.get('/my-results', authenticate, getMyResults);

// Admin/Facilitator gets all submissions
router.get('/all', authenticate, authorize('admin', 'facilitator'), getSubmissions);

// Admin/Facilitator analytics dashboard data
router.get('/analytics', authenticate, authorize('admin', 'facilitator'), getAnalytics);

// Admin/Facilitator grades a submission
router.patch('/grade/:submissionId', authenticate, authorize('admin', 'facilitator'), postResult);

export default router;
