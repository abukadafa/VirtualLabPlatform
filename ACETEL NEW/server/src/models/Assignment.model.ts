import mongoose, { Document, Schema } from 'mongoose';

export interface IAssignment extends Document {
    title: string;
    description: string;
    course: mongoose.Types.ObjectId;
    lab: mongoose.Types.ObjectId;
    deadline: Date;
    maxFileSize: number; // in bytes
    allowedExtensions: string[];
    isLocked: boolean; // Prevent changes after grading starts
    createdAt: Date;
    updatedAt: Date;
}

const AssignmentSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lab: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
    deadline: { type: Date, required: true },
    maxFileSize: { type: Number, default: 50 * 1024 * 1024 }, // 50MB default
    allowedExtensions: [{ type: String, default: ['.zip', '.pdf', '.docx', '.py', '.ipynb'] }],
    isLocked: { type: Boolean, default: false }
}, {
    timestamps: true
});

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
