import Session, { ISession, SessionState } from '../models/Session.model';
import dockerService from './docker.service';
import guacamoleService from './guacamole.service';
import resourceManagerService from './resource-manager.service';

class SessionService {
    /**
     * Create a new lab session
     */
    async createSession(
        userId: string,
        labId: string,
        labType: 'AI' | 'Cybersecurity' | 'MIS',
        metadata?: { ipAddress?: string; userAgent?: string }
    ): Promise<ISession> {
        // Check if user already has an active session for this lab
        const existingSession = await this.getActiveSession(userId);
        if (existingSession) {
            throw new Error('You already have an active session. Please end it before starting a new one.');
        }

        // Check capacity
        const capacity = await resourceManagerService.checkAvailableCapacity(labType);

        const session = new Session({
            userId,
            labId,
            state: capacity.available ? 'starting' : 'queued',
            queuePosition: capacity.available ? undefined : capacity.queueLength,
            estimatedWaitTime: capacity.available ? undefined : capacity.queueLength * 60, // Estimate 1 min per queued user
            metadata: metadata || {},
        });

        await session.save();

        // If capacity available, start container immediately
        if (capacity.available) {
            await this.startContainer(session, labType);
        }

        return session;
    }

    /**
     * Start the container for a session
     */
    private async startContainer(session: ISession, labType: 'AI' | 'Cybersecurity' | 'MIS'): Promise<void> {
        try {
            // Update state to starting
            session.state = 'starting';
            await session.save();

            // Start Docker container
            const containerInfo = await dockerService.startLabContainer({
                userId: (session as any).userId.toString(),
                labId: (session as any).labId.toString(),
                labType,
                cpuLimit: parseInt(process.env.CONTAINER_CPU_LIMIT || '2'),
                memoryLimit: process.env.CONTAINER_MEM_LIMIT || '4G',
                diskLimit: process.env.CONTAINER_DISK_LIMIT || '20G',
                internetEnabled: this.isInternetEnabled(labType),
            });

            // Create Guacamole connection
            const guacConnection = await guacamoleService.createConnection(
                containerInfo.containerName,
                containerInfo.ipAddress,
                session.userId.toString()
            );

            // Update session with container details
            session.containerId = containerInfo.containerId;
            session.containerName = containerInfo.containerName;
            session.guacamoleConnectionId = guacConnection.connectionId;
            session.guacamoleToken = guacConnection.token;
            session.state = 'active';
            session.startedAt = new Date();
            session.lastActivityAt = new Date();
            await session.save();

            // Log audit event
            if (session.containerId) {
                const auditLogService = (await import('./audit-log.service')).default;
                await auditLogService.logLabStart(session.userId.toString(), session.labId.toString(), session._id.toString(), session.containerId, labType);
            }
        } catch (error) {

            console.error('Failed to start container:', error);
            session.state = 'stopped';
            await session.save();
            throw error;
        }
    }

    /**
     * Get user's active session
     */
    async getActiveSession(userId: string): Promise<ISession | null> {
        return await Session.findOne({
            userId,
            state: { $in: ['queued', 'starting', 'active', 'idle_warning', 'paused'] },
        }).sort({ createdAt: -1 });
    }

    /**
     * Get session by ID
     */
    async getSessionById(sessionId: string): Promise<ISession | null> {
        return await Session.findById(sessionId);
    }

    /**
     * Extend session (reset idle timer)
     */
    async extendSession(sessionId: string): Promise<void> {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.lastActivityAt = new Date();

        // If session was in idle_warning, move back to active
        if (session.state === 'idle_warning') {
            session.state = 'active';
        }

        await session.save();
    }

    /**
     * Pause a session (suspend container)
     */
    async pauseSession(sessionId: string): Promise<void> {
        const session = await Session.findById(sessionId);
        if (!session || !session.containerId) {
            throw new Error('Session or container not found');
        }

        await dockerService.pauseContainer(session.containerId);

        session.state = 'paused';
        session.pausedAt = new Date();
        await session.save();
    }

    /**
     * Resume a paused session
     */
    async resumeSession(sessionId: string): Promise<void> {
        const session = await Session.findById(sessionId);
        if (!session || !session.containerId) {
            throw new Error('Session or container not found');
        }

        await dockerService.resumeContainer(session.containerId);

        session.state = 'active';
        session.lastActivityAt = new Date();
        await session.save();
    }

    /**
     * Stop a session
     */
    async stopSession(sessionId: string): Promise<void> {
        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Stop container if it exists
        if (session.containerId) {
            try {
                await dockerService.stopContainer(session.containerId);
            } catch (error) {
                console.error('Error stopping container:', error);
            }
        }

        // Delete Guacamole connection
        if (session.guacamoleConnectionId) {
            try {
                await guacamoleService.deleteConnection(session.guacamoleConnectionId);
            } catch (error) {
                console.error('Error deleting Guacamole connection:', error);
            }
        }

        session.state = 'stopped';
        session.stoppedAt = new Date();
        await session.save();
    }

    /**
     * Monitor idle sessions and update states
     */
    async monitorIdleSessions(): Promise<void> {
        const now = new Date();

        const idleWarningThreshold = parseInt(process.env.SESSION_IDLE_WARNING || '15') * 60 * 1000;
        const idlePauseThreshold = parseInt(process.env.SESSION_IDLE_PAUSE || '30') * 60 * 1000;
        const idleStopThreshold = parseInt(process.env.SESSION_IDLE_STOP || '120') * 60 * 1000;

        // Find active sessions
        const activeSessions = await Session.find({
            state: { $in: ['active', 'idle_warning', 'paused'] },
        });

        for (const session of activeSessions) {
            if (!session.lastActivityAt) continue;

            const idleTime = now.getTime() - session.lastActivityAt.getTime();

            try {
                if (session.state === 'paused' && idleTime > idleStopThreshold) {
                    // Stop session after 2 hours of being paused
                    await this.stopSession(session._id.toString());
                } else if (session.state === 'idle_warning' && idleTime > idlePauseThreshold) {
                    // Pause session after 30 minutes idle
                    await this.pauseSession(session._id.toString());
                } else if (session.state === 'active' && idleTime > idleWarningThreshold) {
                    // Warn user after 15 minutes idle
                    session.state = 'idle_warning';
                    await session.save();
                }
            } catch (error) {
                console.error(`Error monitoring session ${session._id}:`, error);
            }
        }
    }

    /**
     * Cleanup expired sessions (delete stopped sessions after 24 hours)
     */
    async cleanupExpiredSessions(): Promise<number> {
        const cleanupThreshold = parseInt(process.env.SESSION_CLEANUP_DAYS || '1') * 24 * 60 * 60 * 1000;
        const cutoffDate = new Date(Date.now() - cleanupThreshold);

        const expiredSessions = await Session.find({
            state: 'stopped',
            stoppedAt: { $lt: cutoffDate },
        });

        let cleaned = 0;
        for (const session of expiredSessions) {
            try {
                // Remove container if it still exists
                if (session.containerId) {
                    await dockerService.removeContainer(session.containerId);
                }

                // Mark as deleted
                session.state = 'deleted';
                await session.save();
                cleaned++;
            } catch (error) {
                console.error(`Error cleaning up session ${session._id}:`, error);
            }
        }

        console.log(`Cleaned up ${cleaned} expired sessions`);
        return cleaned;
    }

    /**
     * Get session statistics
     */
    async getSessionStats(): Promise<any> {
        const stats = await Session.aggregate([
            {
                $group: {
                    _id: '$state',
                    count: { $sum: 1 },
                },
            },
        ]);

        return stats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
        }, {} as Record<SessionState, number>);
    }

    // Helper methods

    private isInternetEnabled(labType: string): boolean {
        const envVar = `${labType.toUpperCase()}_LAB_INTERNET`;
        return process.env[envVar] === 'true';
    }
}

export default new SessionService();
