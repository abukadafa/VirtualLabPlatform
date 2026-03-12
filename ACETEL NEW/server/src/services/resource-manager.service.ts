import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import dockerService from './docker.service';
import Session from '../models/Session.model';

const redisConnection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
});

const labQueue = new Queue('lab-requests', { connection: redisConnection });

// Queue limits to prevent spam
const QUEUE_LIMITS = {
    max_queued_per_user: 1,
    max_queue_rejoin_attempts: 3,
    cooldown_after_stop: 60, // seconds
};

class ResourceManagerService {
    private userQueueAttempts: Map<string, number> = new Map();
    private userLastStopTime: Map<string, number> = new Map();

    constructor() {
        // Initialize queue worker
        this.initQueueWorker();
    }

    /**
     * Check if capacity is available for a new container
     */
    async checkAvailableCapacity(labType?: string): Promise<{
        available: boolean;
        currentCount: number;
        maxCount: number;
        queueLength: number;
    }> {
        const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_CONTAINERS || '30');
        const maxPerLabType = parseInt(process.env.MAX_PER_LAB_TYPE || '10');

        const totalCount = await dockerService.getActiveContainerCount();
        const labTypeCount = labType ? await dockerService.getActiveContainerCount(labType) : 0;

        const queueJobs = await labQueue.getWaiting();

        const available = totalCount < maxConcurrent && (!labType || labTypeCount < maxPerLabType);

        return {
            available,
            currentCount: totalCount,
            maxCount: maxConcurrent,
            queueLength: queueJobs.length,
        };
    }

    /**
     * Queue a lab request when at capacity
     */
    async queueLabRequest(userId: string, labId: string, labType: string): Promise<{
        queuePosition: number;
        estimatedWaitTime: number;
    }> {
        // Check if user can queue
        const canQueue = await this.canUserQueue(userId);
        if (!canQueue.allowed) {
            throw new Error(canQueue.reason || 'Cannot queue request');
        }

        // Add to queue
        const job = await labQueue.add(
            'start-lab',
            {
                userId,
                labId,
                labType,
                timestamp: Date.now(),
            },
            {
                removeOnComplete: true,
                removeOnFail: false,
            }
        );

        const waitingJobs = await labQueue.getWaiting();
        const position = waitingJobs.findIndex((j) => j.id === job.id) + 1;

        return {
            queuePosition: position,
            estimatedWaitTime: position * 60, // Estimate 1 minute per position
        };
    }

    /**
     * Check if user can join the queue
     */
    async canUserQueue(userId: string): Promise<{
        allowed: boolean;
        reason?: string;
        cooldownRemaining?: number;
    }> {
        // Check cooldown period
        const lastStopTime = this.userLastStopTime.get(userId);
        if (lastStopTime) {
            const timeSinceStop = (Date.now() - lastStopTime) / 1000;
            if (timeSinceStop < QUEUE_LIMITS.cooldown_after_stop) {
                return {
                    allowed: false,
                    reason: `Please wait ${Math.ceil(QUEUE_LIMITS.cooldown_after_stop - timeSinceStop)} seconds before starting a new session`,
                    cooldownRemaining: Math.ceil(QUEUE_LIMITS.cooldown_after_stop - timeSinceStop),
                };
            }
        }

        // Check if user already has a queued request
        const userQueuedJobs = await labQueue.getJobs(['waiting'], 0, -1);
        const userInQueue = userQueuedJobs.some((job) => job.data.userId === userId);

        if (userInQueue) {
            return {
                allowed: false,
                reason: 'You already have a pending request in the queue',
            };
        }

        // Check queue attempts
        const attempts = this.userQueueAttempts.get(userId) || 0;
        if (attempts >= QUEUE_LIMITS.max_queue_rejoin_attempts) {
            return {
                allowed: false,
                reason: 'Too many failed attempts. Please try again later.',
            };
        }

        return { allowed: true };
    }

    /**
     * Record that user stopped a session
     */
    recordUserStop(userId: string): void {
        this.userLastStopTime.set(userId, Date.now());
    }

    /**
     * Initialize the queue worker to process lab requests
     */
    private initQueueWorker(): void {
        const worker = new Worker(
            'lab-requests',
            async (job: Job) => {
                const { userId, labId, labType } = job.data;

                console.log(`Processing queued lab request for user ${userId}`);

                // Check capacity again
                const capacity = await this.checkAvailableCapacity(labType);
                if (!capacity.available) {
                    // Still at capacity, re-queue
                    throw new Error('Still at capacity');
                }

                // Find the session and start it
                const session = await Session.findOne({
                    userId,
                    labId,
                    state: 'queued',
                }).sort({ createdAt: -1 });

                if (!session) {
                    console.log(`No queued session found for user ${userId}`);
                    return;
                }

                // Session service will handle starting the container
                // This is called from session.service.ts's startContainer method
                return { sessionId: session._id };
            },
            {
                connection: redisConnection,
                concurrency: 1, // Process one at a time
            }
        );

        worker.on('completed', (job) => {
            console.log(`Queue job ${job.id} completed`);
            // Reset user attempts on success
            this.userQueueAttempts.delete(job.data.userId);
        });

        worker.on('failed', (job, err) => {
            console.error(`Queue job ${job?.id} failed:`, err.message);
            if (job) {
                // Increment user attempts
                const attempts = this.userQueueAttempts.get(job.data.userId) || 0;
                this.userQueueAttempts.set(job.data.userId, attempts + 1);
            }
        });
    }

    /**
     * Detect anomalous CPU usage (potential crypto mining)
     */
    async detectAnomalousCPUUsage(): Promise<void> {
        const containers = await dockerService.docker.listContainers({

            filters: { status: ['running'] },
        });

        for (const containerInfo of containers) {
            try {
                const stats = await dockerService.getContainerStats(containerInfo.Id);
                const cpuPercent = parseFloat(stats.cpuPercent);

                // Alert if CPU usage is consistently high (>90% for 2 CPUs = 180%)
                if (cpuPercent > 180) {
                    console.warn(`⚠️  Suspicious CPU usage in container ${containerInfo.Names[0]}: ${cpuPercent}%`);

                    // TODO: Send alert, potentially stop container
                    // For now, just log
                }
            } catch (error) {
                console.error(`Error checking CPU for container ${containerInfo.Id}:`, error);
            }
        }
    }

    /**
     * Get queue status
     */
    async getQueueStatus(): Promise<any> {
        const waiting = await labQueue.getWaiting();
        const active = await labQueue.getActive();
        const failed = await labQueue.getFailed();

        return {
            waiting: waiting.length,
            active: active.length,
            failed: failed.length,
        };
    }
}

export default new ResourceManagerService();
