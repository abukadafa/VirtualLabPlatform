import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
    userId?: mongoose.Types.ObjectId;
    sessionId?: mongoose.Types.ObjectId;
    eventType: 'lab_start' | 'lab_stop' | 'lab_pause' | 'lab_resume' | 'security' | 'resource_violation' | 'auth_attempt';
    eventData: {
        containerId?: string;
        labType?: string;
        duration?: number;
        violation?: string;
        cpuUsage?: string;
        memoryUsage?: string;
        ipAddress?: string;
        userAgent?: string;
        [key: string]: any;
    };
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        sessionId: {
            type: Schema.Types.ObjectId,
            ref: 'Session',
            index: true,
        },
        eventType: {
            type: String,
            enum: ['lab_start', 'lab_stop', 'lab_pause', 'lab_resume', 'security', 'resource_violation', 'auth_attempt'],
            required: true,
            index: true,
        },
        eventData: {
            type: Schema.Types.Mixed,
            default: {},
        },
        severity: {
            type: String,
            enum: ['info', 'warning', 'error', 'critical'],
            default: 'info',
            index: true,
        },
        message: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ eventType: 1, createdAt: -1 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

class AuditLogService {
    /**
     * Log lab start event
     */
    async logLabStart(userId: string, labId: string, sessionId: string, containerId: string, labType: string): Promise<void> {
        await AuditLog.create({
            userId,
            sessionId,
            eventType: 'lab_start',
            eventData: {
                containerId,
                labType,
            },
            severity: 'info',
            message: `Lab session started: ${labType}`,
        });
    }

    /**
     * Log lab stop event
     */
    async logLabStop(userId: string, sessionId: string, duration: number): Promise<void> {
        await AuditLog.create({
            userId,
            sessionId,
            eventType: 'lab_stop',
            eventData: {
                duration,
            },
            severity: 'info',
            message: `Lab session stopped after ${Math.round(duration / 60)} minutes`,
        });
    }

    /**
     * Log security event
     */
    async logSecurityEvent(event: {
        userId?: string;
        sessionId?: string;
        containerId?: string;
        violation: string;
        severity: 'info' | 'warning' | 'error' | 'critical';
    }): Promise<void> {
        await AuditLog.create({
            userId: event.userId,
            sessionId: event.sessionId,
            eventType: 'security',
            eventData: {
                containerId: event.containerId,
                violation: event.violation,
            },
            severity: event.severity,
            message: `Security event: ${event.violation}`,
        });

        // Real-time Alerting for Tier 2 (D7)
        if (event.severity === 'critical') {
            await this.triggerSecurityAlert(event);
        }
    }

    /**
     * Trigger real-time security alert (D7)
     */
    private async triggerSecurityAlert(event: any): Promise<void> {
        console.error(`🚨 CRITICAL SECURITY ALERT: ${event.violation}`);
        // In Tier 2, this would integrate with PagerDuty, Slack, or SIEM
    }

    /**
     * Log resource violation
     */
    async logResourceViolation(
        sessionId: string,
        containerId: string,
        violation: string,
        stats?: any
    ): Promise<void> {
        await AuditLog.create({
            sessionId,
            eventType: 'resource_violation',
            eventData: {
                containerId,
                violation,
                ...stats,
            },
            severity: 'warning',
            message: `Resource violation: ${violation}`,
        });
    }

    /**
     * Log authentication attempt (D7)
     */
    async logAuthAttempt(userId: string | undefined, identifier: string, success: boolean, message: string, ip?: string): Promise<void> {
        await AuditLog.create({
            userId,
            eventType: 'auth_attempt',
            eventData: {
                identifier: this.maskData(identifier), // Mask PII (D9)
                success,
                ipAddress: ip,
            },
            severity: success ? 'info' : 'warning',
            message: `Auth attempt: ${message}`,
        });
    }

    /**
     * Mask sensitive PII data (D9)
     */
    private maskData(data: string): string {
        if (!data) return data;
        if (data.includes('@')) {
            const [user, domain] = data.split('@');
            return `${user.substring(0, 2)}***@${domain}`;
        }
        return `${data.substring(0, 2)}***`;
    }

    /**
     * Get audit logs with filters
     */
    async getAuditLogs(filters: {
        userId?: string;
        sessionId?: string;
        eventType?: string;
        severity?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }): Promise<IAuditLog[]> {
        const query: any = {};

        if (filters.userId) query.userId = filters.userId;
        if (filters.sessionId) query.sessionId = filters.sessionId;
        if (filters.eventType) query.eventType = filters.eventType;
        if (filters.severity) query.severity = filters.severity;
        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) query.createdAt.$gte = filters.startDate;
            if (filters.endDate) query.createdAt.$lte = filters.endDate;
        }

        return await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .limit(filters.limit || 100);
    }

    /**
     * Get security events summary
     */
    async getSecuritySummary(days: number = 7): Promise<any> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const summary = await AuditLog.aggregate([
            {
                $match: {
                    eventType: 'security',
                    createdAt: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: '$severity',
                    count: { $sum: 1 },
                },
            },
        ]);

        return summary.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
    }
}

export default new AuditLogService();
export { AuditLog };
