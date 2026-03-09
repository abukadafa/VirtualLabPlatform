import mongoose, { Document, Schema, Model } from 'mongoose';

export type SessionState =
    | 'queued'
    | 'starting'
    | 'active'
    | 'idle_warning'
    | 'paused'
    | 'stopped'
    | 'deleted';

export interface ISession extends Document {
    userId: mongoose.Types.ObjectId;
    labId: mongoose.Types.ObjectId;
    labType: 'AI' | 'Cybersecurity' | 'MIS';
    containerId?: string;
    containerName?: string;
    guacamoleConnectionId?: string;
    guacamoleToken?: string;
    state: SessionState;
    queuePosition?: number;
    estimatedWaitTime?: number;
    startedAt?: Date;
    lastActivityAt?: Date;
    pausedAt?: Date;
    stoppedAt?: Date;
    metadata: {
        ipAddress?: string;
        userAgent?: string;
        volumeName?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const SessionSchema: Schema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        labId: {
            type: Schema.Types.ObjectId,
            ref: 'Lab',
            required: true,
            index: true,
        },
        labType: {
            type: String,
            enum: ['AI', 'Cybersecurity', 'MIS'],
            required: true,
            index: true,
        },
        containerId: {
            type: String,
            sparse: true,
        },
        containerName: {
            type: String,
            sparse: true,
        },
        guacamoleConnectionId: {
            type: String,
            sparse: true,
        },
        guacamoleToken: {
            type: String,
            sparse: true,
        },
        state: {
            type: String,
            enum: ['queued', 'starting', 'active', 'idle_warning', 'paused', 'stopped', 'deleted'],
            required: true,
            default: 'queued',
            index: true,
        },
        queuePosition: {
            type: Number,
            min: 0,
        },
        estimatedWaitTime: {
            type: Number,
            min: 0,
        },
        startedAt: {
            type: Date,
        },
        lastActivityAt: {
            type: Date,
        },
        pausedAt: {
            type: Date,
        },
        stoppedAt: {
            type: Date,
        },
        metadata: {
            ipAddress: String,
            userAgent: String,
            volumeName: String,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient queries
SessionSchema.index({ userId: 1, state: 1 });
SessionSchema.index({ labId: 1, state: 1 });
SessionSchema.index({ state: 1, lastActivityAt: 1 });

const Session: Model<ISession> = mongoose.model<ISession>('Session', SessionSchema);
export default Session;
