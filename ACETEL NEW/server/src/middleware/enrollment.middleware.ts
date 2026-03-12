import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const checkEnrollment = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const labId = req.params.id || req.body.labId || req.body.lab;

        if (!labId) {
            return res.status(400).json({ message: 'Lab ID is required for access validation' });
        }

        // Admins pass enrollment check automatically (D3)
        if (req.user?.role === 'admin') {
            return next();
        }

        const enrolledLabs = req.user?.enrolledLabs || [];

        if (!enrolledLabs.includes(labId)) {
            return res.status(403).json({
                message: 'Access denied. You are not enrolled in this lab.'
            });
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Error validating enrollment' });
    }
};
