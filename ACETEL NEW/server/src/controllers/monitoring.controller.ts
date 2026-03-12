import { Request, Response } from 'express';
import monitoringService from '../services/monitoring.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getStatus = async (req: AuthRequest, res: Response) => {
    try {
        const status = await monitoringService.getSystemStatus();
        res.json(status);
    } catch (error: any) {
        console.error('Monitoring Controller Error:', error);
        res.status(500).json({
            message: 'Failed to fetch monitoring status',
            error: error.message
        });
    }
};
