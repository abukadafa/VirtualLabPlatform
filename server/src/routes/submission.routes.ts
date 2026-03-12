import express from 'express';
import { authenticate, authorize, hasPermission } from '../middleware/auth.middleware';
import {
    getUploadUrl,
    confirmSubmission,
    getSubmissionHistory,
    prepareBulkDownload,
    gradeSubmission,
    mockUpload,
    getAllSubmissions,
    getSubmissionsByAssignment,
    getSubmissionAnalytics,
    getMyResults,
    downloadFile
} from '../controllers/submission.controller';

const router = express.Router();

// --- Student Endpoints ---

// Get signed URL for direct upload
router.post('/upload-url', authenticate, hasPermission('submit_assignments'), getUploadUrl);

// Confirm submission after upload
router.post('/confirm', authenticate, hasPermission('submit_assignments'), confirmSubmission);

// Get submission history for an assignment
router.get('/history/:assignmentId', authenticate, hasPermission('submit_assignments'), getSubmissionHistory);

// Get my results
router.get('/my-results', authenticate, hasPermission('view_grades'), getMyResults);


// --- Facilitator/Admin Endpoints ---

// Get all submissions
router.get('/all', authenticate, hasPermission('view_submissions'), getAllSubmissions);

// Get submissions for an assignment
router.get('/assignment/:assignmentId', authenticate, hasPermission('view_submissions'), getSubmissionsByAssignment);

// Get submission analytics
router.get('/analytics', authenticate, hasPermission('view_analytics'), getSubmissionAnalytics);

// Bulk download submissions
router.post('/bulk-download', authenticate, hasPermission('view_submissions'), prepareBulkDownload);

// Grade and lock a submission
router.patch('/grade/:submissionId', authenticate, hasPermission('grade_submissions'), gradeSubmission);

// Download file from submission
router.get('/download/:submissionId/:fileIndex', authenticate, downloadFile);


// --- Development/Mock Endpoints ---

// Mock upload endpoint (simulating S3 for local dev)
router.put('/upload-mock', mockUpload);

export default router;
