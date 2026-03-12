import mongoose, { Document, Schema } from 'mongoose';

export interface ICourseStudent {
    name: string;
    email?: string;
    studentId?: string;
    organisation?: string;
}

export interface ICourse extends Document {
    code: string;
    name: string;
    department: string;
    duration?: string;
    status?: string;
    studentsCount?: number;
    students: ICourseStudent[];
    facilitator?: mongoose.Types.ObjectId;
}

const CourseStudentSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, trim: true },
        studentId: { type: String, trim: true },
        organisation: { type: String, trim: true },
    },
    { _id: false }
);

const CourseSchema: Schema = new Schema(
    {
        code: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        department: { type: String, required: true },
        duration: { type: String, default: 'N/A' },
        status: { type: String, default: 'Active' },
        studentsCount: { type: Number, default: 0 },
        students: { type: [CourseStudentSchema], default: [] },
        facilitator: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

export default mongoose.model<ICourse>('Course', CourseSchema);
