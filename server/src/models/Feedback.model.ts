import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback extends Document {
    user: mongoose.Types.ObjectId;
    userName: string;
    userEmail: string;
    userRole: string;
    category: string;
    subject: string;
    message: string;
    createdAt: Date;
}

const FeedbackSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, required: true },
    category: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);
