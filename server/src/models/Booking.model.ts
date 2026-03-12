import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking {
    user: mongoose.Types.ObjectId;
    lab: mongoose.Types.ObjectId;
    startTime: Date;
    endTime: Date;
    status: 'pending' | 'confirmed' | 'requested' | 'granted' | 'active' | 'completed' | 'cancelled';
    purpose?: string;
    adminNote?: string;
    provisionedUrl?: string;
    provisionedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IBookingDocument extends IBooking, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const BookingSchema = new Schema<IBookingDocument>(
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
            enum: ['pending', 'confirmed', 'requested', 'granted', 'active', 'completed', 'cancelled'],
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
        provisionedUrl: {
            type: String,
            trim: true,
        },
        provisionedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
BookingSchema.index({ user: 1, startTime: -1 });
BookingSchema.index({ lab: 1, startTime: 1 });

const Booking = mongoose.model<IBookingDocument>('Booking', BookingSchema);
export default Booking;
