import { Response } from 'express';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import { AuthRequest } from '../middleware/auth.middleware';
import auditLogService from '../services/audit-log.service';
import aiService from '../services/ai.service';
import AuditLog from '../models/AuditLog.model';
import User from '../models/User.model';
import Booking from '../models/Booking.model';
import Submission from '../models/Submission.model';

const execPromise = util.promisify(exec);

export const getServerHealth = async (req: AuthRequest, res: Response) => {
    try {
        const uptime = process.uptime();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        
        const cpus = os.cpus();
        const loadAvg = os.loadavg();

        // Get Disk Usage
        let diskUsage = 'Unknown';
        try {
            const { stdout } = await execPromise('df -h / | tail -1');
            const parts = stdout.split(/\s+/);
            diskUsage = parts[4] + ' (' + parts[2] + ' used of ' + parts[1] + ')';
        } catch (e) {
            console.error('Disk usage check failed:', e);
        }

        // Get Process Count
        let processCount = 0;
        try {
            const { stdout } = await execPromise('ps aux | wc -l');
            processCount = parseInt(stdout.trim()) - 1;
        } catch (e) {
            console.error('Process count check failed:', e);
        }

        const healthData = {
            status: 'healthy',
            timestamp: new Date(),
            uptime: {
                seconds: Math.floor(uptime),
                formatted: formatUptime(uptime)
            },
            memory: {
                total: formatBytes(totalMemory),
                used: formatBytes(usedMemory),
                free: formatBytes(freeMemory),
                percentage: ((usedMemory / totalMemory) * 100).toFixed(2) + '%'
            },
            storage: {
                usage: diskUsage
            },
            processes: {
                total: processCount
            },
            cpu: {
                model: cpus[0].model,
                cores: cpus.length,
                loadAverage: loadAvg
            },
            platform: os.platform(),
            nodeVersion: process.version
        };

        res.json(healthData);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching health data', error: error.message });
    }
};

export const analyzeLogsWithAI = async (req: AuthRequest, res: Response) => {
    try {
        // Fetch last 100 relevant logs for AI context
        const { logs } = await auditLogService.getAuditLogs({ limit: 100 });
        
        const analysis = await aiService.analyzeAuditLogs(logs);
        res.json({ analysis });
    } catch (error: any) {
        res.status(500).json({ message: 'AI analysis failed', error: error.message });
    }
};

export const analyzeUserActivityWithAI = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch logs for specific user
        const { logs } = await auditLogService.getAuditLogs({ userId: userId as string, limit: 100 });
        
        const analysis = await aiService.analyzeUserActivity(user.name, logs);
        res.json({ analysis });
    } catch (error: any) {
        res.status(500).json({ message: 'User AI analysis failed', error: error.message });
    }
};

export const getSystemLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { eventType, severity, userId, startDate, endDate, limit, skip } = req.query;

        const filters: any = {
            eventType: typeof eventType === 'string' ? eventType : undefined,
            severity: typeof severity === 'string' ? severity : undefined,
            userId: typeof userId === 'string' ? userId : undefined,
            startDate: typeof startDate === 'string' ? new Date(startDate) : undefined,
            endDate: typeof endDate === 'string' ? new Date(endDate) : undefined,
            limit: typeof limit === 'string' ? parseInt(limit) : 50,
            skip: typeof skip === 'string' ? parseInt(skip) : 0
        };

        const result = await auditLogService.getAuditLogs(filters);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
    }
};

export const getQuickStats = async (req: AuthRequest, res: Response) => {
    try {
        const [userCount, activeBookings, totalSubmissions] = await Promise.all([
            User.countDocuments(),
            Booking.countDocuments({ status: 'active' }),
            Submission.countDocuments()
        ]);

        res.json({
            users: userCount,
            activeSessions: activeBookings,
            submissions: totalSubmissions
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching quick stats', error: error.message });
    }
};

function formatUptime(seconds: number) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
