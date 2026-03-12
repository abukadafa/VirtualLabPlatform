import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ILab extends Document {
    name: string;
    type: 'AI' | 'Cybersecurity' | 'MIS';
    description: string;
    software: string[];
    capacity: number;
    status: 'active' | 'maintenance' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}

const LabSchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        type: {
            type: String,
            enum: ['AI', 'Cybersecurity', 'MIS'],
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        software: [
            {
                type: String,
            },
        ],
        capacity: {
            type: Number,
            required: true,
            default: 50,
        },
        status: {
            type: String,
            enum: ['active', 'maintenance', 'inactive'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<ILab>('Lab', LabSchema);
