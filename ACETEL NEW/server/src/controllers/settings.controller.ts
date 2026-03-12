import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import storageService from '../services/storage.service';
import configService from '../services/config.service';
import emailService from '../services/email.service';

// Get all system settings (admin only)
export const getSettings = async (req: AuthRequest, res: Response) => {
    try {
        const general = await configService.get('general');
        const smtp = await configService.get('smtp');
        const s3 = await configService.get('s3');
        const templates = await configService.get('notification_templates');

        res.json({
            general: general || { appName: 'Virtual Lab Platform', logoUrl: '', faviconUrl: '', primaryColor: '#3b82f6', secondaryColor: '#8b5cf6' },
            smtp: smtp ? { ...smtp, auth: { user: (smtp as any).auth?.user || '', pass: '***' } } : null,
            s3: s3 ? { ...s3, credentials: { accessKeyId: (s3 as any).credentials?.accessKeyId || '', secretAccessKey: '***' } } : null,
            notification_templates: templates || {}
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching settings', error: error.message });
    }
};

// Update system settings (admin only)
export const updateSettings = async (req: AuthRequest, res: Response) => {
    try {
        const { key, value } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!['general', 'smtp', 's3', 'notification_templates'].includes(key)) {
            return res.status(400).json({ message: 'Invalid settings key' });
        }

        await configService.set(key, value, userId);

        res.json({ message: 'Settings updated successfully', key });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating settings', error: error.message });
    }
};

// Test SMTP connection
export const testSMTP = async (req: AuthRequest, res: Response) => {
    try {
        const { smtpConfig } = req.body;

        await emailService.testConnection(smtpConfig);

        res.json({ message: 'SMTP connection successful' });
    } catch (error: any) {
        res.status(500).json({ message: 'SMTP connection failed', error: error.message });
    }
};

// Test S3 connection
export const testS3 = async (req: AuthRequest, res: Response) => {
    try {
        const { s3Config } = req.body;

        if (!s3Config || !s3Config.region || !s3Config.credentials || !s3Config.bucket) {
            return res.status(400).json({ message: 'Invalid S3 configuration' });
        }

        await storageService.testConnection(s3Config);

        res.json({ message: 'S3 connection successful. Bucket is accessible.' });
    } catch (error: any) {
        console.error('S3 Test Error:', error);
        res.status(500).json({ message: 'S3 connection test failed', error: error.message });
    }
};
