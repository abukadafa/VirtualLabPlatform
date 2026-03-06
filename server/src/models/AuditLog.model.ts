import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
    action: string;
    details: string;
    createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
    action: { type: String, required: true },
    details: { type: String, required: true },
}, {
    timestamps: true
});

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
