import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmission extends Document {
    student: mongoose.Types.ObjectId;
    assignment: mongoose.Types.ObjectId;
    lab: mongoose.Types.ObjectId;
    booking: mongoose.Types.ObjectId;
    files: {
        name: string;
        storagePath: string;
        size: number;
        mimeType: string;
    }[];
    attemptNumber: number;
    submittedAt: Date;

    // Lab Environment Metadata
    labMetadata: {
        instanceId: string;
        imageType: string;
        softwareVersions: Map<string, string>;
    };

    // Security & Compliance Hooks
    securityHooks: {
        virusScanStatus: 'pending' | 'clean' | 'infected';
        plagiarismScore?: number;
        autoExported: boolean; // If exported directly from lab
    };

    status: 'submitted' | 'on-time' | 'late';
    gradingStatus: 'pending' | 'graded';
    isLocked: boolean; // Locked after grading
    grade?: number;
    feedback?: string;
}

const SubmissionSchema: Schema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    files: [{
        name: { type: String, required: true },
        storagePath: { type: String, required: true },
        size: { type: Number, required: true },
        mimeType: { type: String, required: true }
    }],
    attemptNumber: { type: Number, default: 1 },
    submittedAt: { type: Date, default: Date.now },

    labMetadata: {
        instanceId: { type: String },
        imageType: { type: String },
        softwareVersions: { type: Map, of: String }
    },

    securityHooks: {
        virusScanStatus: {
            type: String,
            enum: ['pending', 'clean', 'infected'],
            default: 'pending'
        },
        plagiarismScore: { type: Number },
        autoExported: { type: Boolean, default: false }
    },

    status: {
        type: String,
        enum: ['submitted', 'on-time', 'late'],
        default: 'submitted'
    },
    gradingStatus: {
        type: String,
        enum: ['pending', 'graded'],
        default: 'pending'
    },
    isLocked: { type: Boolean, default: false },
    grade: { type: Number, min: 0, max: 100 },
    feedback: { type: String }
}, {
    timestamps: true
});

SubmissionSchema.index({ student: 1, assignment: 1, attemptNumber: -1 });
SubmissionSchema.index({ assignment: 1 });

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
