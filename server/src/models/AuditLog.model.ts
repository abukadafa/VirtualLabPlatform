import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
    userId?: mongoose.Types.ObjectId;
    sessionId?: mongoose.Types.ObjectId;
    eventType: 
        | 'login_success' 
        | 'login_failure' 
        | 'logout' 
        | 'lab_start' 
        | 'lab_stop' 
        | 'cmd_exec' 
        | 'file_upload' 
        | 'file_download' 
        | 'security_alert' 
        | 'resource_violation';
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    eventData: {
        ipAddress?: string;
        userAgent?: string;
        deviceInfo?: string;
        containerId?: string;
        command?: string;
        fileName?: string;
        fileSize?: number;
        reason?: string;
        [key: string]: any;
    };
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
            required: true,
            index: true,
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
        eventData: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ eventType: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

// Automatically delete logs after 90 days to maintain performance
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
