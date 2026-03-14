import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking {
    user: mongoose.Types.ObjectId;
    lab: mongoose.Types.ObjectId;
    startTime: Date;
    endTime: Date;
    status: 'pending' | 'confirmed' | 'requested' | 'granted' | 'active' | 'completed' | 'cancelled';
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    provisioningType?: 'aws' | 'local' | null;
    provisioningStatus?: 'not_started' | 'pending' | 'provisioned' | 'failed' | 'expired' | 'deleted';
    expiresAt?: Date;
    deletionScheduledAt?: Date;
    extensionStatus?: 'none' | 'requested' | 'approved' | 'rejected';
    extensionRequestedUntil?: Date;
    extensionReason?: string;
    purpose?: string;
    adminNote?: string;
    provisionedUrl?: string;
    provisionedAt?: Date;
    localProvisioning?: {
        templateName?: string;
        vmId?: string;
        nodeName?: string;
        username?: string;
        password?: string;
        ipAddress?: string;
        sshPort?: number;
        cpuCores?: number;
        memoryMb?: number;
        diskGb?: number;
    };
    awsProvisioning?: {
        launchUrl?: string;
        accountLabel?: string;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IBookingDocument extends IBooking, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const BookingSchema = new Schema<IBookingDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        lab: {
            type: Schema.Types.ObjectId,
            ref: 'Lab',
            required: true,
        },
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'requested', 'granted', 'active', 'completed', 'cancelled'],
            default: 'pending',
        },
        approvalStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        provisioningType: {
            type: String,
            enum: ['aws', 'local', null],
            default: null,
        },
        provisioningStatus: {
            type: String,
            enum: ['not_started', 'pending', 'provisioned', 'failed', 'expired', 'deleted'],
            default: 'not_started',
        },
        expiresAt: {
            type: Date,
        },
        deletionScheduledAt: {
            type: Date,
        },
        extensionStatus: {
            type: String,
            enum: ['none', 'requested', 'approved', 'rejected'],
            default: 'none',
        },
        extensionRequestedUntil: {
            type: Date,
        },
        extensionReason: {
            type: String,
            trim: true,
        },
        purpose: {
            type: String,
            trim: true,
        },
        adminNote: {
            type: String,
            trim: true,
        },
        provisionedUrl: {
            type: String,
            trim: true,
        },
        provisionedAt: {
            type: Date,
        },
        localProvisioning: {
            templateName: { type: String, trim: true },
            vmId: { type: String, trim: true },
            nodeName: { type: String, trim: true },
            username: { type: String, trim: true },
            password: { type: String, trim: true },
            ipAddress: { type: String, trim: true },
            sshPort: { type: Number },
            cpuCores: { type: Number },
            memoryMb: { type: Number },
            diskGb: { type: Number },
        },
        awsProvisioning: {
            launchUrl: { type: String, trim: true },
            accountLabel: { type: String, trim: true },
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
BookingSchema.index({ user: 1, startTime: -1 });
BookingSchema.index({ lab: 1, startTime: 1 });

const Booking = mongoose.model<IBookingDocument>('Booking', BookingSchema);
export default Booking;
