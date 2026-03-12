import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking extends Document {
    user: mongoose.Types.ObjectId;
    lab: mongoose.Types.ObjectId;
    startTime: Date;
    endTime: Date;
    status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
    purpose?: string;
    adminNote?: string;
    createdAt: Date;
    updatedAt: Date;
}

const BookingSchema: Schema = new Schema(
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
            enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
            default: 'pending',
        },
        purpose: {
            type: String,
            trim: true,
        },
        adminNote: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
BookingSchema.index({ user: 1, startTime: -1 });
BookingSchema.index({ lab: 1, startTime: 1 });

export default mongoose.model<IBooking>('Booking', BookingSchema);
