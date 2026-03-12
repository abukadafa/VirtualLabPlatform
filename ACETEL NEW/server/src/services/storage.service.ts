import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import configService from './config.service';

export interface StorageProvider {
    getUploadUrl(key: string, contentType: string): Promise<string>;
    getDownloadUrl(key: string): Promise<string>;
    deleteObject(key: string): Promise<void>;
    testConnection(configOverride?: any): Promise<void>;
}

export class S3StorageProvider implements StorageProvider {
    private async getClient(configOverride?: any) {
        const config = configOverride || await configService.getS3Config();

        if (!config || !config.credentials?.accessKeyId || !config.credentials?.secretAccessKey) {
            throw new Error('S3 configuration is missing or incomplete (accessKeyId/secretAccessKey required)');
        }

        return {
            client: new S3Client({
                region: config.region || 'us-east-1',
                credentials: {
                    accessKeyId: config.credentials.accessKeyId,
                    secretAccessKey: config.credentials.secretAccessKey,
                },
            }),
            bucket: config.bucket
        };
    }

    async getUploadUrl(key: string, contentType: string): Promise<string> {
        const { client, bucket } = await this.getClient();
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
        });
        return getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour
    }

    async getDownloadUrl(key: string): Promise<string> {
        const { client, bucket } = await this.getClient();
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        return getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour
    }

    async deleteObject(key: string): Promise<void> {
        // Implementation for delete...
    }

    async testConnection(configOverride?: any): Promise<void> {
        const { client, bucket } = await this.getClient(configOverride);

        // Simple retry logic
        let lastError: any;
        for (let i = 0; i < 3; i++) {
            try {
                const command = new ListObjectsV2Command({
                    Bucket: bucket,
                    MaxKeys: 1
                });
                await client.send(command);
                return; // Success
            } catch (error: any) {
                lastError = error;
                if (error.name === 'NoSuchBucket' || error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
                    break; // Don't retry auth/config errors
                }
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
        throw lastError || new Error('S3 connection test failed');
    }
}

// Mock provider for local development
export class LocalStorageProvider implements StorageProvider {
    async getUploadUrl(key: string, contentType: string): Promise<string> {
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

    async testConnection(): Promise<void> {
        // Always succeed in local dev
        return;
    }
}

const provider = process.env.NODE_ENV === 'production'
    ? new S3StorageProvider()
    : new LocalStorageProvider();

export default provider;
