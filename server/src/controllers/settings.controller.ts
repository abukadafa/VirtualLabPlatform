import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import configService from '../services/config.service';
import emailService from '../services/email.service';
import Role from '../models/Role.model';

// Get public branding settings (no auth required)
export const getPublicSettings = async (req: any, res: Response) => {
    try {
        const [general, roles] = await Promise.all([
            configService.get('general'),
            Role.find({}, 'name color description').lean()
        ]);

        res.json({
            ...(general || { 
                appName: 'ACETEL Virtual Laboratory Platform', 
                logoUrl: 'https://nou.edu.ng/wp-content/uploads/2021/12/Logo-1.png', 
                secondaryLogoUrl: 'https://nou.edu.ng/wp-content/uploads/2022/02/logo.png',
                faviconUrl: 'https://nou.edu.ng/wp-content/uploads/2022/02/logo.png', 
                primaryColor: '#068a50', 
                secondaryColor: '#056aab' 
            }),
            roles: roles.length > 0 ? roles : [
                { name: 'student' },
                { name: 'facilitator' },
                { name: 'admin' }
            ]
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching public settings', error: error.message });
    }
};

// Get all system settings (admin only)
export const getSettings = async (req: AuthRequest, res: Response) => {
    try {
        const general = await configService.get('general');
        const smtp = await configService.get('smtp');
        const s3 = await configService.get('s3');
        const templates = await configService.get('notification_templates');
        const proxmox = await configService.get('proxmox');

        res.json({
            general: general || { 
                appName: 'ACETEL Virtual Laboratory Platform', 
                logoUrl: 'https://nou.edu.ng/wp-content/uploads/2021/12/Logo-1.png', 
                secondaryLogoUrl: 'https://nou.edu.ng/wp-content/uploads/2022/02/logo.png',
                faviconUrl: 'https://nou.edu.ng/wp-content/uploads/2022/02/logo.png', 
                primaryColor: '#068a50', 
                secondaryColor: '#056aab' 
            },
            smtp: smtp ? { ...smtp, auth: { user: (smtp as any).auth?.user || '', pass: '***' } } : null,
            s3: s3 ? { ...s3, credentials: { accessKeyId: (s3 as any).credentials?.accessKeyId || '', secretAccessKey: '***' } } : null,
            notification_templates: templates || {},
            proxmox: proxmox ? {
                ...proxmox,
                apiTokenSecret: (proxmox as any).apiTokenSecret ? '***' : '',
                vpn: {
                    ...(proxmox as any).vpn,
                    privateKey: (proxmox as any).vpn?.privateKey ? '***' : '',
                    presharedKey: (proxmox as any).vpn?.presharedKey ? '***' : ''
                }
            } : null
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

        if (!['general', 'smtp', 's3', 'notification_templates', 'proxmox'].includes(key)) {
            return res.status(400).json({ message: 'Invalid settings key' });
        }

        // Handle secrets: Don't overwrite with '***' placeholders from the UI
        if (key === 'smtp') {
            const existing = await configService.get<any>('smtp') || {};
            if (value.auth?.pass === '***') {
                value.auth.pass = existing.auth?.pass;
            }
        } else if (key === 's3') {
            const existing = await configService.get<any>('s3') || {};
            if (value.credentials?.secretAccessKey === '***') {
                value.credentials.secretAccessKey = existing.credentials?.secretAccessKey;
            }
        } else if (key === 'proxmox') {
            const existing = await configService.get<any>('proxmox') || {};
            if (value.apiTokenSecret === '***') {
                value.apiTokenSecret = existing.apiTokenSecret;
            }
            if (value.vpn?.privateKey === '***') {
                value.vpn.privateKey = existing.vpn?.privateKey;
            }
            if (value.vpn?.presharedKey === '***') {
                value.vpn.presharedKey = existing.vpn?.presharedKey;
            }
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

        // Basic validation of S3 config structure
        if (!s3Config || !s3Config.region || !s3Config.credentials || !s3Config.bucket) {
            return res.status(400).json({ message: 'Invalid S3 configuration' });
        }

        res.json({ message: 'S3 configuration appears valid. Upload a test file to fully verify.' });
    } catch (error: any) {
        res.status(500).json({ message: 'S3 connection test failed', error: error.message });
    }
};
