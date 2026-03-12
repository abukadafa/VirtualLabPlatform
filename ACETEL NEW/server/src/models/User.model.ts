import mongoose, { Document, Schema, CallbackError } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    name: string;
    username: string;
    email: string;
    password: string;
    role: 'student' | 'facilitator' | 'admin';
    status: 'enrolled' | 'completed' | 'inactive';
    programmes: string[];
    studentId?: string;
    lastEnrollmentDate?: Date;
    completionDate?: Date;
    enrolledLabs: mongoose.Types.ObjectId[];
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    failedAttempts: number;
    lockUntil?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    isLocked(): boolean;
}

const UserSchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        role: {
            type: String,
            enum: ['student', 'facilitator', 'admin'],
            default: 'student',
        },
        status: {
            type: String,
            enum: ['enrolled', 'completed', 'inactive'],
            default: 'enrolled',
        },
        programmes: [
            {
                type: String,
                enum: [
                    'MSc Artificial Intelligence',
                    'MSc Cybersecurity',
                    'MSc Management Information System',
                    'PhD Artificial Intelligence',
                    'PhD Cybersecurity',
                    'PhD Management Information System'
                ],
                trim: true,
            },
        ],
        enrolledLabs: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Lab',
                default: [],
            },
        ],
        studentId: {
            type: String,
            trim: true,
        },
        lastEnrollmentDate: {
            type: Date,
            default: Date.now,
        },
        completionDate: {
            type: Date,
        },
        resetPasswordToken: {
            type: String,
        },
        resetPasswordExpires: {
            type: Date,
        },
        failedAttempts: {
            type: Number,
            required: true,
            default: 0,
        },
        lockUntil: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password as string, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
UserSchema.methods.isLocked = function (): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
};

export default mongoose.model<IUser>('User', UserSchema);
