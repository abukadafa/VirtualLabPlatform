import { Response } from 'express';
import Lab from '../models/Lab.model';
import Booking from '../models/Booking.model';
import { AuthRequest } from '../middleware/auth.middleware';
import sessionService from '../services/session.service';
import resourceManagerService from '../services/resource-manager.service';
import auditLogService from '../services/audit-log.service';

// Get all labs
export const getAllLabs = async (req: AuthRequest, res: Response) => {
    try {
        const query: any = { status: 'active' };

        // If user is not admin, filter by their programme
        if (req.user && req.user.role !== 'admin') {
            const userProgrammes = req.user.programmes || [];
            
            // Map full programme names to lab types
            const typeMapping: { [key: string]: string } = {
                'Artificial Intelligence': 'AI',
                'Cybersecurity': 'Cybersecurity',
                'Management Information System': 'MIS'
            };

            const allowedTypes = userProgrammes.map(p => typeMapping[p]).filter(Boolean);
            
            if (allowedTypes.length > 0) {
                query.type = { $in: allowedTypes as any };
            } else {
                // If user has no programmes, return no labs
                query.type = { $in: [] };
            }
        }

        const labs = await Lab.find(query);
        res.json(labs);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get lab by ID
export const getLabById = async (req: AuthRequest, res: Response) => {
    try {
        const lab = await Lab.findById(req.params.id);
        if (!lab) {
            return res.status(404).json({ message: 'Lab not found' });
        }
        res.json(lab);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Create lab (Admin only)
export const createLab = async (req: AuthRequest, res: Response) => {
    try {
        const { name, type, description, software, capacity } = req.body;

        const lab = new Lab({
            name,
            type,
            description,
            software,
            capacity,
        });

        await lab.save();
        res.status(201).json(lab);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update lab (Admin only)
export const updateLab = async (req: AuthRequest, res: Response) => {
    try {
        const lab = await Lab.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!lab) {
            return res.status(404).json({ message: 'Lab not found' });
        }
        res.json(lab);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete lab (Admin only)
export const deleteLab = async (req: AuthRequest, res: Response) => {
    try {
        const lab = await Lab.findByIdAndDelete(req.params.id);
        if (!lab) {
            return res.status(404).json({ message: 'Lab not found' });
        }
        res.json({ message: 'Lab deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// =============== Session Management Endpoints ===============

/**
 * POST /api/labs/:id/start
 * Start a lab session
 */
export const startLab = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const labId = req.params.id;

        // Students must have an approved and provisioned booking in the active time window.
        const now = new Date();
        const booking = await Booking.findOne({
            user: userId,
            lab: labId,
            approvalStatus: 'approved',
            provisioningStatus: 'provisioned',
            startTime: { $lte: now },
            endTime: { $gt: now }
        });

        const typeMapping: { [key: string]: string } = {
            'Artificial Intelligence': 'AI',
            'Cybersecurity': 'Cybersecurity',
            'Management Information System': 'MIS'
        };

        // Get lab details
        const lab = await Lab.findById(labId);
        if (!lab) {
            return res.status(404).json({ message: 'Lab not found' });
        }

        const staffAllowedByProgramme = (req.user?.role === 'facilitator' || req.user?.role === 'lab technician') &&
            (req.user?.programmes || []).some(p => typeMapping[p] === lab.type);

        if (!booking && req.user?.role !== 'admin' && !staffAllowedByProgramme) {
            return res.status(403).json({
                message: 'Access denied. You do not have an approved and provisioned booking for this lab.'
            });
        }

        // Create session
        const session = await sessionService.createSession(
            userId,
            labId as string,
            lab.type as 'AI' | 'Cybersecurity' | 'MIS',
            {
                ipAddress: req.ip || '',
                userAgent: (req.headers['user-agent'] as string) || '',
            }
        );

        // Log audit event
        if (session.containerId) {
            await auditLogService.logLabStart(userId, lab.type.toString(), req);
        }

        const guacamoleBaseUrl = process.env.GUACAMOLE_BASE_URL || '';
        const guacamoleUrl = `${guacamoleBaseUrl}/guacamole/#/client/${session.guacamoleConnectionId}?token=${session.guacamoleToken}`;

        res.status(201).json({
            sessionId: session._id.toString(),
            state: session.state,
            queuePosition: session.queuePosition,
            estimatedWaitTime: session.estimatedWaitTime,
            guacamoleUrl: session.guacamoleConnectionId ? guacamoleUrl : undefined,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to start lab session' });
    }
};

/**
 * POST /api/labs/:id/stop
 * Stop a lab session
 */
export const stopLab = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const session = await sessionService.getActiveSession(userId);

        if (!session) {
            return res.status(404).json({ message: 'No active session found' });
        }

        // Calculate duration
        const duration = session.startedAt ? Date.now() - session.startedAt.getTime() : 0;

        await sessionService.stopSession(session._id.toString());

        // Log audit event
        await auditLogService.logLabStop(userId, session.labType.toString(), req);

        // Record stop for rate limiting
        resourceManagerService.recordUserStop(userId);

        res.json({ message: 'Lab session stopped successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to stop lab session' });
    }
};

/**
 * GET /api/labs/:id/status
 * Get container and session status
 */
export const getLabStatus = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const session = await sessionService.getActiveSession(userId);

        if (!session) {
            return res.status(404).json({ message: 'No active session found' });
        }

        res.json({
            sessionId: session._id.toString(),
            state: session.state,
            queuePosition: session.queuePosition,
            estimatedWaitTime: session.estimatedWaitTime,
            startedAt: session.startedAt,
            lastActivityAt: session.lastActivityAt,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to get lab status' });
    }
};

/**
 * GET /api/labs/:id/connection
 * Get Guacamole connection details
 */
export const getLabConnection = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const session = await sessionService.getActiveSession(userId);

        if (!session) {
            return res.status(404).json({ message: 'No active session found' });
        }

        if (!session.guacamoleConnectionId || !session.guacamoleToken) {
            return res.status(400).json({ message: 'Session not ready yet' });
        }

        const guacamoleBaseUrl = process.env.GUACAMOLE_BASE_URL || '';
        res.json({
            connectionUrl: `${guacamoleBaseUrl}/guacamole/#/client/${session.guacamoleConnectionId}?token=${session.guacamoleToken}`,
            connectionId: session.guacamoleConnectionId,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to get connection details' });
    }
};

/**
 * POST /api/labs/:id/extend
 * Extend session (reset idle timer)
 */
export const extendSession = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const session = await sessionService.getActiveSession(userId);

        if (!session) {
            return res.status(404).json({ message: 'No active session found' });
        }

        await sessionService.extendSession(session._id.toString());

        res.json({ message: 'Session extended successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to extend session' });
    }
};

/**
 * GET /api/labs/queue
 * Get queue status for user
 */
export const getQueueStatus = async (req: AuthRequest, res: Response) => {
    try {
        const queueStatus = await resourceManagerService.getQueueStatus();
        res.json(queueStatus);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to get queue status' });
    }
};
