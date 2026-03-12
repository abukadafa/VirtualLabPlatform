import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
    code: string;
    name: string;
    department: string;
    facilitator: mongoose.Types.ObjectId;
}

const CourseSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    department: { type: String, required: true },
    facilitator: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
    timestamps: true
});

export default mongoose.model<ICourse>('Course', CourseSchema);
