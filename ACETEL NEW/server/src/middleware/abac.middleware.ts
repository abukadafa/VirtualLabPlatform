import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export interface PolicyContext {
    user: any;
    resource: string;
    action: string;
    environment: {
        time: string;
        ip: string;
    };
}

export const abacGuard = (policy: (context: PolicyContext) => boolean) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const context: PolicyContext = {
            user: req.user,
            resource: req.baseUrl + req.path,
            action: req.method,
            environment: {
                time: new Date().toISOString(),
                ip: req.ip || '',
            },
        };

        if (!policy(context)) {
            return res.status(403).json({
                message: 'Access denied: Policy evaluation failed (ABAC)'
            });
        }

        next();
    };
};
