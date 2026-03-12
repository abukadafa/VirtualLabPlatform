import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Submission from '../models/Submission.model';
import Assignment from '../models/Assignment.model';
import storageProvider from '../services/storage.service';
import emailService from '../services/email.service';
import auditLogService from '../services/audit-log.service';
import { EventEmitter } from 'events';
import { sanitizeFilename, isValidMimeType } from '../utils/fileValidation.util';

// Simple event emitter for notifications (could be replaced by BullMQ or similar)
export const submissionEvents = new EventEmitter();

/**
 * Request a signed URL for direct cloud upload
 */
export const getUploadUrl = async (req: AuthRequest, res: Response) => {
    try {
        const { assignmentId, labId, fileName, contentType } = req.body;
        const studentId = req.user?.id;

        let storagePrefix = 'general';
        
        if (assignmentId) {
            const assignment = await Assignment.findById(assignmentId).populate('course');
            if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

            // 1. Deadline & Lock Check
            if (new Date() > assignment.deadline) {
                return res.status(403).json({ message: 'Submission deadline has passed' });
            }
            if (assignment.isLocked) {
                return res.status(403).json({ message: 'Assignment is locked for editing' });
            }
            const courseCode = (assignment.course as any).code || 'unknown';
            storagePrefix = `${courseCode}/${assignmentId}`;
        } else if (labId) {
            storagePrefix = `labs/${labId}`;
        }

        // 2. Validation
        const sanitizedName = sanitizeFilename(fileName);
        const extension = '.' + sanitizedName.split('.').pop()?.toLowerCase();

        // Standard allowed extensions for general lab tasks
        const allowedExtensions = ['.pdf', '.zip', '.docx', '.py', '.ipynb', '.jpg', '.jpeg', '.png'];
        
        if (assignmentId) {
            const assignment = await Assignment.findById(assignmentId);
            if (assignment?.allowedExtensions && !assignment.allowedExtensions.includes(extension)) {
                return res.status(400).json({ message: `Invalid file type. Allowed: ${assignment.allowedExtensions.join(', ')}` });
            }
        } else if (!allowedExtensions.includes(extension)) {
            return res.status(400).json({ message: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}` });
        }

        // 3. MIME type validation
        if (!isValidMimeType(sanitizedName, contentType)) {
            return res.status(400).json({ message: 'Content-Type mismatch for file extension' });
        }

        const storageKey = `${storagePrefix}/${studentId}/${Date.now()}-${sanitizedName}`;
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
            labId,
            bookingId,
            title,
            description,
            storageKey,
            fileName,
            size,
            mimeType,
            labMetadata
        } = req.body;
        const studentId = req.user?.id;

        let status = 'submitted';
        let labRef = labId;

        if (assignmentId) {
            const assignment = await Assignment.findById(assignmentId);
            if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
            status = new Date() <= assignment.deadline ? 'on-time' : 'late';
            labRef = assignment.lab;
        } else {
            status = 'on-time'; // Default for non-assignment tasks
        }

        const previousAttempts = await Submission.countDocuments({
            student: studentId,
            ...(assignmentId ? { assignment: assignmentId } : { lab: labRef, booking: bookingId })
        });

        const submission = new Submission({
            student: studentId,
            assignment: assignmentId || undefined,
            lab: labRef,
            booking: bookingId,
            title: title || fileName,
            description,
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

        // Audit Log
        await auditLogService.logFileUpload(studentId!, fileName, size, req);

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

        const submission = await Submission.findById(submissionId).populate('student assignment');
        if (!submission) return res.status(404).json({ message: 'Submission not found' });

        submission.grade = grade;
        submission.feedback = feedback;
        submission.gradingStatus = 'graded';
        submission.isLocked = true; // Lock after grading

        await submission.save();

        // Send notification email
        const student = submission.student as any;
        const assignment = submission.assignment as any;
        try {
            await emailService.sendEmail(student.email, 'submission_graded', {
                name: student.name,
                assignmentName: assignment.title || 'Assignment',
                grade,
                feedback: feedback || 'No feedback provided'
            });
        } catch (emailErr) {
            console.error('Failed to send grading notification email:', emailErr);
        }

        res.json({ message: 'Submission graded and locked', submission });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get all submissions (Admin/Facilitator)
 * Filter by facilitator programme if not admin
 */
export const getAllSubmissions = async (req: AuthRequest, res: Response) => {
    try {
        let query: any = {};

        if (req.user && req.user.role !== 'admin') {
            const userProgrammes = req.user.programmes || [];
            const typeMapping: { [key: string]: string } = {
                'Artificial Intelligence': 'AI',
                'Cybersecurity': 'Cybersecurity',
                'Management Information System': 'MIS'
            };
            const allowedTypes = userProgrammes.map(p => typeMapping[p]).filter(Boolean);
            
            const Lab = (await import('../models/Lab.model')).default;
            const labs = await Lab.find({ type: { $in: allowedTypes } });
            const labIds = labs.map(l => l._id);
            
            query.lab = { $in: labIds };
        }

        const submissions = await Submission.find(query)
            .populate('student', 'name email programmes')
            .populate('lab', 'name type')
            .sort({ submittedAt: -1 });

        res.json(submissions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get submissions for a specific assignment
 */
export const getSubmissionsByAssignment = async (req: AuthRequest, res: Response) => {
    try {
        const { assignmentId } = req.params;
        let query: any = { assignment: assignmentId };

        // Security check for facilitators
        if (req.user && req.user.role !== 'admin') {
            const userProgrammes = req.user.programmes || [];
            const typeMapping: { [key: string]: string } = {
                'Artificial Intelligence': 'AI',
                'Cybersecurity': 'Cybersecurity',
                'Management Information System': 'MIS'
            };
            const allowedTypes = userProgrammes.map(p => typeMapping[p]).filter(Boolean);
            
            const Lab = (await import('../models/Lab.model')).default;
            const labs = await Lab.find({ type: { $in: allowedTypes } });
            const labIds = labs.map(l => l._id);
            
            query.lab = { $in: labIds };
        }

        const submissions = await Submission.find(query)
            .populate('student', 'name email programmes')
            .populate('lab', 'name type')
            .sort({ submittedAt: -1 });

        res.json(submissions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get submission analytics (Facilitator/Admin)
 */
export const getSubmissionAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        let query: any = {};

        if (req.user && req.user.role !== 'admin') {
            const userProgrammes = req.user.programmes || [];
            const typeMapping: { [key: string]: string } = {
                'Artificial Intelligence': 'AI',
                'Cybersecurity': 'Cybersecurity',
                'Management Information System': 'MIS'
            };
            const allowedTypes = userProgrammes.map(p => typeMapping[p]).filter(Boolean);
            
            const Lab = (await import('../models/Lab.model')).default;
            const labs = await Lab.find({ type: { $in: allowedTypes } });
            const labIds = labs.map(l => l._id);
            
            query.lab = { $in: labIds };
        }

        const totalSubmissions = await Submission.countDocuments(query);
        const pendingSubmissions = await Submission.countDocuments({ ...query, gradingStatus: 'pending' });
        const gradedSubmissions = await Submission.countDocuments({ ...query, gradingStatus: 'graded' });

        // Grade stats
        const gradedSubs = await Submission.find({ ...query, gradingStatus: 'graded' });
        const grades = gradedSubs.map(s => s.grade || 0);
        
        const gradeStats = {
            averageGrade: grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0,
            highestGrade: grades.length > 0 ? Math.max(...grades) : 0,
            lowestGrade: grades.length > 0 ? Math.min(...grades) : 0,
        };

        res.json({
            totalSubmissions,
            pendingSubmissions,
            gradedSubmissions,
            gradeStats
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get current student's results
 */
export const getMyResults = async (req: AuthRequest, res: Response) => {
    try {
        const studentId = req.user?.id;
        const results = await Submission.find({ 
            student: studentId, 
            gradingStatus: 'graded' 
        })
        .populate('lab', 'name type')
        .sort({ submittedAt: -1 });

        res.json(results);
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

/**
 * Download a specific file from a submission
 */
export const downloadFile = async (req: AuthRequest, res: Response) => {
    try {
        const submissionId = req.params.submissionId as string;
        const fileIndex = req.params.fileIndex as string;
        
        const submission = await Submission.findById(submissionId);

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Security: Only allow if admin, facilitator, or the student themselves
        if (req.user?.role !== 'admin' && req.user?.role !== 'facilitator' && submission.student.toString() !== req.user?.id) {
            return res.status(403).json({ message: 'Not authorized to download this file' });
        }

        const idx = parseInt(fileIndex);
        if (isNaN(idx) || idx < 0 || idx >= submission.files.length) {
            return res.status(400).json({ message: 'Invalid file index' });
        }

        const file = submission.files[idx];
        const downloadUrl = await storageProvider.getDownloadUrl(file.storagePath);

        // Audit Log
        await auditLogService.log({
            userId: req.user?.id,
            eventType: 'file_download',
            message: `File downloaded: ${file.name}`,
            severity: 'info',
            eventData: { fileName: file.name, submissionId: submission._id },
            req
        });

        res.redirect(downloadUrl);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
