import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendee {
    name: string;
    email?: string;
    organisation?: string;
    role?: string;
}

export interface IAcademicEvent extends Document {
    name: string;
    type: 'Workshop' | 'Conference';
    date: Date;
    location: string;
    description?: string;
    attendance: IAttendee[];
    createdAt: Date;
    updatedAt: Date;
}

const AttendeeSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, trim: true },
        organisation: { type: String, trim: true },
        role: { type: String, trim: true, default: 'Attendee' },
    },
    { _id: false }
);

const AcademicEventSchema: Schema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        type: { type: String, enum: ['Workshop', 'Conference'], required: true },
        date: { type: Date, required: true },
        location: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        attendance: { type: [AttendeeSchema], default: [] },
    },
    { timestamps: true }
);

export default mongoose.model<IAcademicEvent>('AcademicEvent', AcademicEventSchema);
