import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemConfig extends Document {
    key: string; // 'general' | 'smtp' | 's3' | 'notifications'
    value: any;
    updatedBy: mongoose.Types.ObjectId;
}

const SystemConfigSchema: Schema = new Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        enum: ['general', 'smtp', 's3', 'notification_templates', 'proxmox', 'proxmox_status']
    },
    value: {
        type: Schema.Types.Mixed,
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const SystemConfig = mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
export default SystemConfig;
