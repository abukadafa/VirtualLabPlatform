import cron, { ScheduledTask } from 'node-cron';
import sessionService from '../services/session.service';
import dockerService from '../services/docker.service';
import resourceManagerService from '../services/resource-manager.service';

/**
 * Background jobs for session management and monitoring
 */
export class BackgroundJobs {
    private static instance: BackgroundJobs;
    private jobs: ScheduledTask[] = [];

    private constructor() { }

    static getInstance(): BackgroundJobs {
        if (!BackgroundJobs.instance) {
            BackgroundJobs.instance = new BackgroundJobs();
        }
        return BackgroundJobs.instance;
    }

    /**
     * Start all background  jobs
     */
    start(): void {
        console.log('🚀 Starting background jobs...');

        // Job 1: Monitor idle sessions (every 5 minutes)
        const idleMonitorJob = cron.schedule('*/5 * * * *', async () => {
            try {
                console.log('[Job] Monitoring idle sessions...');
                await sessionService.monitorIdleSessions();
            } catch (error) {
                console.error('[Job] Error monitoring idle sessions:', error);
            }
        });
        this.jobs.push(idleMonitorJob);

        // Job 2: Cleanup expired sessions (daily at 2 AM)
        const cleanupSessionsJob = cron.schedule('0 2 * * *', async () => {
            try {
                console.log('[Job] Cleaning up expired sessions...');
                const cleaned = await sessionService.cleanupExpiredSessions();
                console.log(`[Job] Cleaned ${cleaned} expired sessions`);
            } catch (error) {
                console.error('[Job] Error cleaning up sessions:', error);
            }
        });
        this.jobs.push(cleanupSessionsJob);

        // Job 3: Cleanup expired containers (daily at 3 AM)
        const cleanupContainersJob = cron.schedule('0 3 * * *', async () => {
            try {
                console.log('[Job] Cleaning up expired containers...');
                const cleaned = await dockerService.cleanupExpiredContainers(24);
                console.log(`[Job] Cleaned ${cleaned} expired containers`);
            } catch (error) {
                console.error('[Job] Error cleaning up containers:', error);
            }
        });
        this.jobs.push(cleanupContainersJob);

        // Job 4: Detect anomalous CPU usage (every 10 minutes)
        const cpuMonitorJob = cron.schedule('*/10 * * * *', async () => {
            try {
                console.log('[Job] Monitoring CPU usage...');
                await resourceManagerService.detectAnomalousCPUUsage();
            } catch (error) {
                console.error('[Job] Error monitoring CPU:', error);
            }
        });
        this.jobs.push(cpuMonitorJob);

        // Job 5: Session statistics (every hour)
        const statsJob = cron.schedule('0 * * * *', async () => {
            try {
                console.log('[Job] Collecting session statistics...');
                const stats = await sessionService.getSessionStats();
                console.log('[Job] Session stats:', stats);
            } catch (error) {
                console.error('[Job] Error collecting stats:', error);
            }
        });
        this.jobs.push(statsJob);

        console.log(`✅ Started ${this.jobs.length} background jobs`);
    }

    /**
     * Stop all background jobs
     */
    stop(): void {
        console.log('🛑 Stopping background jobs...');
        this.jobs.forEach((job) => job.stop());
        this.jobs = [];
    }

    /**
     * Get job status
     */
    getStatus(): { running: boolean; jobCount: number } {
        return {
            running: this.jobs.length > 0,
            jobCount: this.jobs.length,
        };
    }
}

export default BackgroundJobs.getInstance();
