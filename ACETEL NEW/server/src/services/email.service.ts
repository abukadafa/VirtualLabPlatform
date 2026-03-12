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
