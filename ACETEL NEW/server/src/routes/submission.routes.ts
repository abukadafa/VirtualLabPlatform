import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
    getUploadUrl,
    confirmSubmission,
    getSubmissionHistory,
    prepareBulkDownload,
    gradeSubmission,
    getAllSubmissions,
    getSubmissionAnalytics,
    mockUpload
} from '../controllers/submission.controller';

const router = express.Router();

// --- Student Endpoints ---

// Get signed URL for direct upload
router.post('/upload-url', authenticate, getUploadUrl);

// Confirm submission after upload
router.post('/confirm', authenticate, confirmSubmission);

// Get submission history for an assignment
router.get('/history/:assignmentId', authenticate, getSubmissionHistory);


// --- Facilitator/Admin Endpoints ---

// Get all submissions
router.get('/all', authenticate, authorize('admin', 'facilitator'), getAllSubmissions);

// Get analytics
router.get('/analytics', authenticate, authorize('admin', 'facilitator'), getSubmissionAnalytics);

// Bulk download submissions
router.post('/bulk-download', authenticate, authorize('admin', 'facilitator'), prepareBulkDownload);

// Grade and lock a submission
router.patch('/grade/:submissionId', authenticate, authorize('admin', 'facilitator'), gradeSubmission);


// --- Development/Mock Endpoints ---

// Mock upload endpoint (simulating S3 for local dev)
router.put('/upload-mock', mockUpload);

export default router;
