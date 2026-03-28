import mongoose, { Document, Schema } from 'mongoose';

export interface IRole {
    name: string;
    description: string;
    permissions: string[];
    isSystemRole: boolean; // Protect admin/facilitator/student from deletion
    color?: string;
}

export interface IRoleDocument extends IRole, Document {
    createdAt: Date;
    updatedAt: Date;
}

const RoleSchema = new Schema<IRoleDocument>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        permissions: [{
            type: String,
            trim: true,
        }],
        isSystemRole: {
            type: Boolean,
            default: false,
        },
        color: {
            type: String,
            default: 'from-emerald-600 to-green-600',
        }
    },
    {
        timestamps: true,
    }
);

const Role = mongoose.models.Role || mongoose.model<IRoleDocument>('Role', RoleSchema);
export default Role;
