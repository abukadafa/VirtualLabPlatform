import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';

export interface StorageProvider {
    getUploadUrl(key: string, contentType: string): Promise<string>;
    getDownloadUrl(key: string): Promise<string>;
    deleteObject(key: string): Promise<void>;
}

export class S3StorageProvider implements StorageProvider {
    private client: S3Client;
    private bucket: string;

    constructor() {
        this.client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });
        this.bucket = process.env.AWS_S3_BUCKET || '';
    }

    async getUploadUrl(key: string, contentType: string): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });
        return getSignedUrl(this.client, command, { expiresIn: 3600 }); // 1 hour
    }

    async getDownloadUrl(key: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        return getSignedUrl(this.client, command, { expiresIn: 3600 }); // 1 hour
    }

    async deleteObject(key: string): Promise<void> {
        // Implementation for delete...
    }
}

// Mock provider for local development
export class LocalStorageProvider implements StorageProvider {
    async getUploadUrl(key: string, contentType: string): Promise<string> {
        // In local dev, we point to our own API that handles the upload
        const baseUrl = process.env.API_URL || 'http://localhost:5000';
        return `${baseUrl}/api/submissions/upload-mock?key=${encodeURIComponent(key)}`;
    }

    async getDownloadUrl(key: string): Promise<string> {
        const baseUrl = process.env.API_URL || 'http://localhost:5000';
        return `${baseUrl}/uploads/${key}`;
    }

    async deleteObject(key: string): Promise<void> {
        console.log(`Mock delete: ${key}`);
    }
}

const provider = process.env.NODE_ENV === 'production'
    ? new S3StorageProvider()
    : new LocalStorageProvider();

export default provider;
