import SystemConfig from '../models/SystemConfig.model';

export class ConfigService {
    private cache: Map<string, any> = new Map();
    private cacheTTL = 60000; // 1 minute
    private lastFetch: Map<string, number> = new Map();

    async get<T>(key: string, envFallback?: string): Promise<T> {
        const now = Date.now();
        const last = this.lastFetch.get(key) || 0;

        if (this.cache.has(key) && (now - last < this.cacheTTL)) {
            return this.cache.get(key) as T;
        }

        try {
            const config = await SystemConfig.findOne({ key });
            if (config) {
                this.cache.set(key, config.value);
                this.lastFetch.set(key, now);
                return config.value as T;
            }
        } catch (error) {
            console.error(`Error fetching config for ${key}:`, error);
        }

        // Fallback to Env if provided
        if (envFallback) {
            const val = process.env[envFallback];
            return (val as unknown) as T;
        }

        return null as unknown as T;
    }

    async set(key: string, value: any, userId: string): Promise<void> {
        await SystemConfig.findOneAndUpdate(
            { key },
            { value, updatedBy: userId },
            { upsert: true, new: true }
        );
        this.cache.set(key, value);
        this.lastFetch.set(key, Date.now());
    }

    /**
     * Helper for SMTP settings
     */
    async getSMTPConfig() {
        return this.get<any>('smtp') || {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            secure: process.env.SMTP_SECURE === 'true',
            from: process.env.SMTP_FROM || 'no-reply@virtuallab.com'
        };
    }

    /**
     * Helper for S3 settings
     */
    async getS3Config() {
        const dbConfig = await this.get<any>('s3');
        if (dbConfig) return dbConfig;

        return {
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
            bucket: process.env.AWS_S3_BUCKET || ''
        };
    }
}

const configService = new ConfigService();
export default configService;
