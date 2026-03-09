import AuditLog, { IAuditLog } from '../models/AuditLog.model';
import { Request } from 'express';

class AuditLogService {
    /**
     * Generic log method that extracts metadata from request if provided
     */
    async log(data: {
        userId?: string;
        sessionId?: string;
        eventType: string;
        message: string;
        severity?: 'info' | 'warning' | 'error' | 'critical';
        eventData?: any;
        req?: Request;
    }): Promise<void> {
        try {
            const auditLog = new AuditLog({
                userId: data.userId,
                sessionId: data.sessionId,
                eventType: data.eventType,
                message: data.message,
                severity: data.severity || 'info',
                eventData: {
                    ...data.eventData,
                    ipAddress: data.req?.ip || data.eventData?.ipAddress || 'unknown',
                    userAgent: data.req?.headers['user-agent'] || data.eventData?.userAgent || 'unknown',
                },
            });
            await auditLog.save();
        } catch (error) {
            console.error('Audit Log Error:', error);
        }
    }

    async logLoginSuccess(userId: string, req: Request): Promise<void> {
        await this.log({
            userId,
            eventType: 'login_success',
            message: 'User logged in successfully',
            severity: 'info',
            req
        });
    }

    async logLoginFailure(userId: string | undefined, reason: string, req: Request): Promise<void> {
        await this.log({
            userId,
            eventType: 'login_failure',
            message: `Login failed: ${reason}`,
            severity: 'warning',
            eventData: { reason },
            req
        });
    }

    async logLogout(userId: string, req: Request): Promise<void> {
        await this.log({
            userId,
            eventType: 'logout',
            message: 'User logged out',
            severity: 'info',
            req
        });
    }

    async logLabStart(userId: string, labType: string, req?: Request): Promise<void> {
        await this.log({
            userId,
            eventType: 'lab_start',
            message: `Lab started: ${labType}`,
            severity: 'info',
            eventData: { labType },
            req
        });
    }

    async logLabStop(userId: string, labType: string, req?: Request): Promise<void> {
        await this.log({
            userId,
            eventType: 'lab_stop',
            message: `Lab stopped: ${labType}`,
            severity: 'info',
            eventData: { labType },
            req
        });
    }

    async logCommandExec(userId: string, containerId: string, command: string): Promise<void> {
        await this.log({
            userId,
            eventType: 'cmd_exec',
            message: `Command executed: ${command.substring(0, 50)}${command.length > 50 ? '...' : ''}`,
            severity: 'info',
            eventData: { containerId, command }
        });
    }

    async logFileUpload(userId: string, fileName: string, fileSize: number, req?: Request): Promise<void> {
        await this.log({
            userId,
            eventType: 'file_upload',
            message: `File uploaded: ${fileName}`,
            severity: 'info',
            eventData: { fileName, fileSize },
            req
        });
    }

    /**
     * Get audit logs with filters
     */
    async getAuditLogs(filters: {
        userId?: string;
        eventType?: string;
        severity?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        skip?: number;
    }): Promise<{ logs: IAuditLog[]; total: number }> {
        const query: any = {};

        if (filters.userId) query.userId = filters.userId;
        if (filters.eventType) query.eventType = filters.eventType;
        if (filters.severity) query.severity = filters.severity;
        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) query.createdAt.$gte = filters.startDate;
            if (filters.endDate) query.createdAt.$lte = filters.endDate;
        }

        const total = await AuditLog.countDocuments(query);
        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(filters.skip || 0)
            .limit(filters.limit || 50)
            .populate('userId', 'name email username');

        return { logs, total };
    }
}

export default new AuditLogService();
