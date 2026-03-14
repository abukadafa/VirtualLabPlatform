import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import Booking from '../models/Booking.model';
import proxmoxService from './proxmox.service';

type ProvisioningJobData = {
    bookingId: string;
};

class LocalProvisioningQueueService {
    private redis: Redis | null = null;
    private queue: Queue<ProvisioningJobData> | null = null;
    private worker: Worker<ProvisioningJobData> | null = null;
    private ready = false;

    async init(): Promise<void> {
        try {
            this.redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
                maxRetriesPerRequest: null,
                lazyConnect: true,
            });
            await this.redis.connect();

            this.queue = new Queue<ProvisioningJobData>('local-provisioning', { connection: this.redis });
            this.worker = new Worker<ProvisioningJobData>(
                'local-provisioning',
                async (job) => this.processJob(job),
                { connection: this.redis, concurrency: 1 }
            );

            this.worker.on('failed', (job, error) => {
                console.error(`[LocalProvisioningQueue] Job ${job?.id} failed:`, error.message);
            });

            this.ready = true;
            console.log('✅ Local provisioning queue initialized');
        } catch (error) {
            this.ready = false;
            console.error('⚠️ Local provisioning queue unavailable, falling back to inline provisioning:', error);
        }
    }

    async enqueue(bookingId: string): Promise<void> {
        if (this.ready && this.queue) {
            await this.queue.add('provision-local-vm', { bookingId }, { removeOnComplete: true, removeOnFail: false });
            return;
        }

        await this.processBooking(bookingId);
    }

    private async processJob(job: Job<ProvisioningJobData>): Promise<void> {
        await this.processBooking(job.data.bookingId);
    }

    private async processBooking(bookingId: string): Promise<void> {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        const localConfig = booking.localProvisioning as any || {};
        if (!localConfig.templateName || !localConfig.vmId) {
            booking.provisioningStatus = 'failed';
            booking.adminNote = 'Provisioning failed: template name and VM ID are required.';
            await booking.save();
            throw new Error('Local provisioning is missing templateName or vmId');
        }

        try {
            await proxmoxService.provisionVm({
                templateName: localConfig.templateName,
                vmId: localConfig.vmId,
                nodeName: localConfig.nodeName,
                cpuCores: localConfig.cpuCores,
                memoryMb: localConfig.memoryMb,
                diskGb: localConfig.diskGb,
                username: localConfig.username,
                password: localConfig.password,
            });

            booking.provisioningStatus = 'provisioned';
            booking.status = 'granted';
            booking.provisionedAt = new Date();
            booking.adminNote = booking.adminNote || 'Local VM provisioned successfully.';
            await booking.save();
        } catch (error: any) {
            booking.provisioningStatus = 'failed';
            booking.status = booking.approvalStatus === 'approved' ? 'confirmed' : booking.status;
            booking.adminNote = `Provisioning failed: ${error.message}`;
            await booking.save();
            throw error;
        }
    }
}

const localProvisioningQueueService = new LocalProvisioningQueueService();
export default localProvisioningQueueService;
