import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import configService from './config.service';

export class EmailService {
    private async getTransporter() {
        const smtpConfig = await configService.getSMTPConfig();
        return nodemailer.createTransport(smtpConfig);
    }

    private async getTemplate(eventName: string) {
        const templates = await configService.get<any>('notification_templates') || {};
        return templates[eventName] || this.getDefaultTemplate(eventName);
    }

    private getDefaultTemplate(eventName: string) {
        const defaults: { [key: string]: { subject: string, body: string } } = {
            'welcome': {
                subject: 'Welcome to Virtual Lab Platform',
                body: 'Hello {{name}},\n\nWelcome to the platform. Your account is now active.'
            },
            'password_reset': {
                subject: 'Password Reset Request',
                body: 'Hello {{name}},\n\nYou requested a password reset. Please click the link below to reset your password:\n\n{{resetLink}}\n\nThis link will expire in 1 hour.'
            },
            'submission_confirmation': {
                subject: 'Assignment Submission Received',
                body: 'Hello {{name}},\n\nYour submission for "{{assignmentName}}" has been received. Attempt #{{attempt}}.'
            },
            'new_submission_alert': {
                subject: 'New Submission: {{assignmentName}}',
                body: 'A new submission has been received from {{studentName}} for the assignment "{{assignmentName}}".'
            },
            'feedback': {
                subject: 'New Feedback: {{subject}}',
                body: 'You have received new feedback from {{userName}} ({{userEmail}}).\n\nCategory: {{category}}\nSubject: {{subject}}\n\nMessage:\n{{message}}'
            },
            'feedback_confirmation': {
                subject: 'Feedback Received: {{subject}}',
                body: 'Hello {{name}},\n\nThank you for your feedback. We have received it and will review it soon.'
            },
            'booking_confirmed': {
                subject: 'Lab Booking Confirmed: {{labName}}',
                body: 'Hello {{name}},\n\nYour booking for "{{labName}}" from {{startTime}} to {{endTime}} has been CONFIRMED.\n\nAdmin Note: {{adminNote}}\n\nYou can now access the lab during your scheduled time.'
            },
            'booking_cancelled': {
                subject: 'Lab Booking Cancelled/Denied: {{labName}}',
                body: 'Hello {{name}},\n\nYour booking for "{{labName}}" scheduled for {{startTime}} has been CANCELLED or DENIED.\n\nReason/Note: {{adminNote}}\n\nIf you have questions, please contact the administrator.'
            },
            'booking_completed': {
                subject: 'Lab Session Completed: {{labName}}',
                body: 'Hello {{name}},\n\nYour lab session for "{{labName}}" has been marked as COMPLETED.\n\nWe hope you had a productive session!'
            },
            'submission_graded': {
                subject: 'Assignment Graded: {{assignmentName}}',
                body: 'Hello {{name}},\n\nYour submission for "{{assignmentName}}" has been graded.\n\nGrade: {{grade}}\nFeedback: {{feedback}}\n\nYou can view the details in your dashboard.'
            },
            'enrollment_notification': {
                subject: 'Account Enrolled: Virtual Lab Platform',
                body: 'Hello {{name}},\n\nYour account on the Virtual Lab Platform has been set to "{{status}}".\n\nRole: {{role}}\nProgrammes: {{programmes}}\n\nYou can now log in and access your assigned resources.'
            }
        };

        return defaults[eventName] || { subject: 'Notification', body: 'You have a new notification.' };
    }

    async sendEmail(to: string, eventName: string, data: any) {
        try {
            const transporter = await this.getTransporter();
            const template = await this.getTemplate(eventName);

            const subjectTemplate = Handlebars.compile(template.subject);
            const bodyTemplate = Handlebars.compile(template.body);

            const mailOptions = {
                from: (await configService.getSMTPConfig()).from || 'no-reply@virtuallab.com',
                to,
                subject: subjectTemplate(data),
                text: bodyTemplate(data)
                // In a real app, you'd add html support too
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`[Email] Sent ${eventName} to ${to}: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error(`[Email Error] Failed to send ${eventName} to ${to}:`, error);
            throw error;
        }
    }

    async testConnection(smtpConfig: any) {
        const transporter = nodemailer.createTransport(smtpConfig);
        return transporter.verify();
    }
}

const emailService = new EmailService();
export default emailService;
