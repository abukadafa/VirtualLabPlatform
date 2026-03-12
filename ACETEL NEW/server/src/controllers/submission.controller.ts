import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Submission from '../models/Submission.model';
import User from '../models/User.model';
import Assignment from '../models/Assignment.model';
import storageProvider from '../services/storage.service';
import { EventEmitter } from 'events';
import { sanitizeFilename, isValidMimeType } from '../utils/fileValidation.util';

// Simple event emitter for notifications (could be replaced by BullMQ or similar)
export const submissionEvents = new EventEmitter();

/**
 * Request a signed URL for direct cloud upload
 */
export const getUploadUrl = async (req: AuthRequest, res: Response) => {
    try {
        const { assignmentId, fileName, contentType } = req.body;
        const studentId = req.user?.id;

        const assignment = await Assignment.findById(assignmentId).populate('course');
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        // 1. Deadline & Lock Check
        if (new Date() > assignment.deadline) {
            return res.status(403).json({ message: 'Submission deadline has passed' });
        }
        if (assignment.isLocked) {
            return res.status(403).json({ message: 'Assignment is locked for editing' });
        }

        // 2. Assignment-specific Validation
        const sanitizedName = sanitizeFilename(fileName);
        const extension = '.' + sanitizedName.split('.').pop()?.toLowerCase();

        if (assignment.allowedExtensions && !assignment.allowedExtensions.includes(extension)) {
            return res.status(400).json({ message: `Invalid file type. Allowed: ${assignment.allowedExtensions.join(', ')}` });
        }

        // 3. MIME type validation (to prevent extension spoofing)
        if (!isValidMimeType(sanitizedName, contentType)) {
            return res.status(400).json({ message: 'Content-Type mismatch for file extension' });
        }

        const courseCode = (assignment.course as any).code || 'unknown';
        const storageKey = `${courseCode}/${assignmentId}/${studentId}/${Date.now()}-${sanitizedName}`;

        const uploadUrl = await storageProvider.getUploadUrl(storageKey, contentType);

        res.json({ uploadUrl, storageKey, fileName: sanitizedName });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Confirm submission after successful cloud upload
 */
export const confirmSubmission = async (req: AuthRequest, res: Response) => {
    try {
        const {
            assignmentId,
            bookingId,
            storageKey,
            fileName,
            size,
            mimeType,
            labMetadata // { instanceId, imageType, softwareVersions }
        } = req.body;
        const studentId = req.user?.id;

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        // Preservation logic: Check existing attempts
        const previousAttempts = await Submission.countDocuments({
            student: studentId,
            assignment: assignmentId
        });

        const status = new Date() <= assignment.deadline ? 'on-time' : 'late';

        const submission = new Submission({
            student: studentId,
            assignment: assignmentId,
            lab: assignment.lab,
            booking: bookingId,
            files: [{
                name: fileName,
                storagePath: storageKey,
                size,
                mimeType
            }],
            attemptNumber: previousAttempts + 1,
            labMetadata: labMetadata || {},
            securityHooks: {
                virusScanStatus: 'pending',
                autoExported: req.body.autoExported || false
            },
            status,
            submittedAt: new Date()
        });

        await submission.save();

        // --- Notification Events ---
        submissionEvents.emit('submissionReceived', {
            studentId,
            assignmentId,
            submissionId: submission._id
        });

        // --- Simulate Async Virus Scan ---
        simulateVirusScan(submission._id.toString());

        res.status(201).json({
            message: 'Submission confirmed successfully. Attempt #' + submission.attemptNumber,
            submission
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get all submissions (Facilitator/Admin)
export const getAllSubmissions = async (req: AuthRequest, res: Response) => {
    try {
        const filter: any = {};

        // If facilitator, only show submissions for enrolled labs
        if (req.user?.role === 'facilitator') {
            const user = await User.findById(req.user.id);
            if (!user) return res.status(404).json({ message: 'User not found' });
            filter.lab = { $in: user.enrolledLabs };
        }

        const submissions = await Submission.find(filter)
            .populate('student', 'name email programme')
            .populate('lab', 'name type')
            .sort({ submittedAt: -1 });

        res.json(submissions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get submission analytics (Facilitator/Admin)
export const getSubmissionAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const filter: any = {};

        if (req.user?.role === 'facilitator') {
            const user = await User.findById(req.user.id);
            if (!user) return res.status(404).json({ message: 'User not found' });
            filter.lab = { $in: user.enrolledLabs };
        }

        const totalSubmissions = await Submission.countDocuments(filter);
        const pendingSubmissions = await Submission.countDocuments({ ...filter, gradingStatus: 'pending' });
        const gradedSubmissions = await Submission.countDocuments({ ...filter, gradingStatus: 'graded' });

        const submissions = await Submission.find(filter);
        const grades = submissions.filter(s => s.grade !== undefined).map(s => s.grade!);

        const gradeStats = {
            averageGrade: grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0,
            highestGrade: grades.length > 0 ? Math.max(...grades) : 0,
            lowestGrade: grades.length > 0 ? Math.min(...grades) : 0,
        };

        res.json({
            totalSubmissions,
            pendingSubmissions,
            gradedSubmissions,
            gradeStats,
            submissionsByLab: [], // Could be expanded
            recentActivity: [] // Could be expanded
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get submission history (Student/Facilitator)
 */
export const getSubmissionHistory = async (req: AuthRequest, res: Response) => {
    try {
        const { assignmentId } = req.params;
        const studentId = req.user?.role === 'student' ? req.user.id : req.query.studentId;

        const history = await Submission.find({
            student: studentId,
            assignment: assignmentId
        }).sort({ attemptNumber: -1 });

        res.json(history);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Bulk Download Preparation (Facilitator)
 */
export const prepareBulkDownload = async (req: AuthRequest, res: Response) => {
    try {
        const { assignmentId, submissionIds } = req.body;

        const submissions = await Submission.find({
            _id: { $in: submissionIds },
            assignment: assignmentId
        }).populate('student', 'name email');

        // Logic to generate signed URLs for all files
        const filesWithUrls = await Promise.all(submissions.map(async (sub) => {
            const file = sub.files[0];
            const url = await storageProvider.getDownloadUrl(file.storagePath);
            return {
                studentName: (sub.student as any).name,
                fileName: file.name,
                downloadUrl: url
            };
        }));

        res.json({
            message: 'Bulk download URLs generated',
            files: filesWithUrls
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Mark a submission as graded and lock it
 */
export const gradeSubmission = async (req: AuthRequest, res: Response) => {
    try {
        const { submissionId } = req.params;
        const { grade, feedback } = req.body;

        const submission = await Submission.findById(submissionId);
        if (!submission) return res.status(404).json({ message: 'Submission not found' });

        submission.grade = grade;
        submission.feedback = feedback;
        submission.gradingStatus = 'graded';
        submission.isLocked = true; // Lock after grading

        await submission.save();

        res.json({ message: 'Submission graded and locked', submission });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Mock virus scan simulation
 */
const simulateVirusScan = async (submissionId: string) => {
    console.log(`[SECURITY] Starting virus scan for submission: ${submissionId}`);
    // Simulate async processing delay
    setTimeout(async () => {
        try {
            await Submission.findByIdAndUpdate(submissionId, {
                'securityHooks.virusScanStatus': 'clean',
                'securityHooks.scanCompletedAt': new Date()
            });
            console.log(`[SECURITY] Virus scan CLEAN for submission: ${submissionId}`);
        } catch (error) {
            console.error(`[SECURITY] Virus scan processing failed:`, error);
        }
    }, 5000);
};

/**
 * Mock upload endpoint for local development
 */
export const mockUpload = async (req: any, res: Response) => {
    console.log(`Mock upload received for key: ${req.query.key}`);
    res.json({ message: 'Mock upload successful' });
};
