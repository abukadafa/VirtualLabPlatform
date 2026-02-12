import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmission extends Document {
    student: mongoose.Types.ObjectId;
    lab: mongoose.Types.ObjectId;
    booking: mongoose.Types.ObjectId;
    files: {
        name: string;
        path: string;
        size: number;
        mimeType: string;
    }[];
    submittedAt: Date;
    grade?: number;
    feedback?: string;
    status: 'pending' | 'graded';
}

const SubmissionSchema: Schema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    files: [{
        name: { type: String, required: true },
        path: { type: String, required: true },
        size: { type: Number, required: true },
        mimeType: { type: String, required: true }
    }],
    submittedAt: { type: Date, default: Date.now },
    grade: { type: Number, min: 0, max: 100 },
    feedback: { type: String },
    status: { type: String, enum: ['pending', 'graded'], default: 'pending' }
}, {
    timestamps: true
});

// Index for quick lookups
SubmissionSchema.index({ student: 1, lab: 1 });
SubmissionSchema.index({ booking: 1 });

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
