import { submissionEvents } from '../controllers/submission.controller';
import emailService from './email.service';
import User from '../models/User.model';
import Assignment from '../models/Assignment.model';

/**
 * Handle submission received event
 * Notify student and facilitator
 */
submissionEvents.on('submissionReceived', async ({ studentId, assignmentId, submissionId }) => {
    console.log(`[Notification] Student ${studentId} submitted to Assignment ${assignmentId}. Submission ID: ${submissionId}`);

    try {
        // Fetch student and assignment details
        const student = await User.findById(studentId);
        const assignment = await Assignment.findById(assignmentId);

        if (student) {
            // Send confirmation email to student
            await emailService.sendEmail(student.email, 'submission_confirmation', {
                name: student.name,
                assignmentName: assignment?.title || 'Assignment',
                attempt: 1 // You can track this from submission history
            });
        }

        // Notify facilitators (you can expand this to find facilitators for the programme)
        // For now, just log
        console.log(`[Notification] Facilitators should be notified about new submission from ${student?.name}`);
    } catch (error) {
        console.error('[Notification Error]', error);
    }
});

export const initNotifications = () => {
    console.log('🔔 Notification service initialized');
};
