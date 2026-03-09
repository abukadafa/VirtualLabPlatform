import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
    name: string;
    username: string;
    email: string;
    password: string;
    role: string;
    status: 'enrolled' | 'completed' | 'inactive';
    programmes: string[];
    studentId?: string;
    isDeleted?: boolean;
    deletedAt?: Date;
    deletionReason?: string;
    lastEnrollmentDate?: Date;
    completionDate?: Date;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    addedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserDocument extends IUser, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
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
                trim: true,
            },
        ],
        studentId: {
            type: String,
            trim: true,
        },
        addedBy: {
            type: String,
            index: true,
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
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        deletedAt: {
            type: Date,
        },
        deletionReason: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error: any) {
        throw new Error(error);
    }
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUserDocument>('User', UserSchema);
export default User;
