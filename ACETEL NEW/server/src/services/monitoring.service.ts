import os from 'os';
import mongoose from 'mongoose';
import { Redis } from 'ioredis';
import dockerService from './docker.service';
import resourceManagerService from './resource-manager.service';

class MonitoringService {
    private redis: Redis;

    constructor() {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            lazyConnect: true // Don't connect until needed
        });
    }

    async getSystemStatus() {
        const stats: any = {};

        // 1. OS Metrics
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memPercent = (usedMem / totalMem) * 100;

        stats.system = {
            platform: os.platform(),
            uptime: os.uptime(), // seconds
            cpuCount: os.cpus().length,
            loadAvg: os.loadavg(), // [1m, 5m, 15m]
            memory: {
                total: this.formatBytes(totalMem),
                used: this.formatBytes(usedMem),
                free: this.formatBytes(freeMem),
                percent: memPercent.toFixed(1)
            }
        };

        // 2. Database Status
        stats.database = {
            status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            name: mongoose.connection.name,
            host: mongoose.connection.host
        };

        // 3. Redis Status
        try {
            const redisStatus = await this.redis.ping();
            stats.redis = {
                status: redisStatus === 'PONG' ? 'connected' : 'error'
            };
        } catch (error) {
            stats.redis = { status: 'disconnected', error: (error as Error).message };
        }

        // 4. Lab Containers Status
        try {
            const activeContainers = await dockerService.getActiveContainerCount();
            const capacity = await resourceManagerService.checkAvailableCapacity();
            const queueStatus = await resourceManagerService.getQueueStatus();

            stats.labs = {
                activeContainers,
                maxContainers: capacity.maxCount,
                availableCapacity: capacity.available,
                queue: queueStatus
            };
        } catch (error) {
            stats.labs = { status: 'error', error: (error as Error).message };
        }

        // 5. Alerts
        stats.alerts = this.generateAlerts(stats);

        return stats;
    }

    private generateAlerts(stats: any) {
        const alerts = [];

        if (stats.system.memory.percent > 90) {
            alerts.push({
                severity: 'critical',
                type: 'memory',
                message: `System memory usage is very high: ${stats.system.memory.percent}%`
            });
        } else if (stats.system.memory.percent > 80) {
            alerts.push({
                severity: 'warning',
                type: 'memory',
                message: `System memory usage is high: ${stats.system.memory.percent}%`
            });
        }

        if (stats.database.status !== 'connected') {
            alerts.push({
                severity: 'critical',
                type: 'database',
                message: 'Database connection is lost'
            });
        }

        if (stats.redis.status !== 'connected') {
            alerts.push({
                severity: 'warning',
                type: 'redis',
                message: 'Redis connection is lost (Queue might not work)'
            });
        }

        if (stats.labs.activeContainers >= stats.labs.maxContainers) {
            alerts.push({
                severity: 'warning',
                type: 'labs',
                message: 'Lab capacity reached. New requests will be queued.'
            });
        }

        return alerts;
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }
}

export default new MonitoringService();
