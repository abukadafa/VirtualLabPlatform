import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Submission from '../models/Submission.model';
import Booking from '../models/Booking.model';
import Lab from '../models/Lab.model';

/**
 * Submit work for a lab session
 */
export const submitWork = async (req: AuthRequest, res: Response) => {
    try {
        const { bookingId, files } = req.body;
        const studentId = req.user?.id;

        const booking = await Booking.findById(bookingId).populate('lab');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if student owns the booking
        if (booking.user.toString() !== studentId?.toString()) {
            return res.status(403).json({ message: 'Unauthorized submission' });
        }

        const submission = new Submission({
            student: studentId,
            lab: (booking.lab as any)._id,
            booking: bookingId,
            files: files || [],
            submittedAt: new Date(),
            status: 'pending'
        });

        await submission.save();

        res.status(201).json({
            message: 'Work submitted successfully',
            submission
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get all submissions (Admin/Facilitator)
 */
export const getSubmissions = async (req: AuthRequest, res: Response) => {
    try {
        const query: any = {};

        // Filter for facilitators
        if (req.user?.role === 'facilitator' && req.user.programme) {
            const programmeMap: Record<string, string> = {
                'Artificial Intelligence': 'AI',
                'Cybersecurity': 'Cybersecurity',
                'Management Information System': 'MIS'
            };
            const labType = programmeMap[req.user.programme];
            if (labType) {
                // Find labs of this type
                const labs = await Lab.find({ type: labType }).select('_id');
                query.lab = { $in: labs.map(l => l._id) };
            }
        }

        if (req.query.labId) {
            query.lab = req.query.labId; // Override if specific lab requested (though should still be within allowed)
            // Ideally check intersection, but for now assuming frontend respects filters
        }

        if (req.query.studentId) {
            query.student = req.query.studentId;
        }

        const submissions = await Submission.find(query)
            .populate('student', 'name email programme')
            .populate('lab', 'name type')
            .sort({ submittedAt: -1 });

        res.json(submissions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


/**
 * Get analytics data for dashboard
 */
// Get analytics data for dashboard
export const getAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const matchStage: any = {};

        // Filter for facilitators
        if (req.user?.role === 'facilitator' && req.user.programme) {
            const programmeMap: Record<string, string> = {
                'Artificial Intelligence': 'AI',
                'Cybersecurity': 'Cybersecurity',
                'Management Information System': 'MIS'
            };
            const labType = programmeMap[req.user.programme];
            if (labType) {
                const labs = await Lab.find({ type: labType }).select('_id');
                matchStage.lab = { $in: labs.map(l => l._id) };
            }
        }

        const totalSubmissions = await Submission.countDocuments(matchStage);
        const pendingSubmissions = await Submission.countDocuments({ ...matchStage, status: 'pending' });
        const gradedSubmissions = await Submission.countDocuments({ ...matchStage, status: 'graded' });

        // Calculate average grade
        const gradeStats = await Submission.aggregate([
            { $match: { ...matchStage, status: 'graded', grade: { $exists: true } } },
            {
                $group: {
                    _id: null,
                    averageGrade: { $avg: '$grade' },
                    highestGrade: { $max: '$grade' },
                    lowestGrade: { $min: '$grade' }
                }
            }
        ]);

        // Submissions per lab type
        const submissionsByLab = await Submission.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'labs',
                    localField: 'lab',
                    foreignField: '_id',
                    as: 'labInfo'
                }
            },
            { $unwind: '$labInfo' },
            {
                $group: {
                    _id: '$labInfo.type',
                    count: { $sum: 1 },
                    avgGrade: { $avg: '$grade' }
                }
            }
        ]);

        // Recent activity (submissions per day for last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentActivity = await Submission.aggregate([
            { $match: { ...matchStage, submittedAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            totalSubmissions,
            pendingSubmissions,
            gradedSubmissions,
            gradeStats: gradeStats[0] || { averageGrade: 0, highestGrade: 0, lowestGrade: 0 },
            submissionsByLab,
            recentActivity
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Post result (Grade and Feedback)
 */
export const postResult = async (req: AuthRequest, res: Response) => {
    try {
        const { submissionId } = req.params;
        const { grade, feedback } = req.body;

        const submission = await Submission.findById(submissionId);
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        if (grade !== undefined) submission.grade = grade;
        if (feedback !== undefined) submission.feedback = feedback;

        submission.status = 'graded';
        await submission.save();

        res.json({
            message: 'Result posted successfully',
            submission
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get student results
 */
export const getMyResults = async (req: AuthRequest, res: Response) => {
    try {
        const studentId = req.user?.id;
        const submissions = await Submission.find({ student: studentId, status: 'graded' })
            .populate('lab', 'name type')
            .sort({ updatedAt: -1 });

        res.json(submissions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
