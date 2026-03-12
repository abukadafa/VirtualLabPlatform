import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Role from '../models/Role.model';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
        programme?: string;
        programmes?: string[];
        permissions?: string[];
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No authentication token, access denied' });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('CRITICAL: JWT_SECRET not configured');
            return res.status(500).json({ message: 'Internal server configuration error' });
        }

        const decoded = jwt.verify(token, jwtSecret) as {
            id: string;
            role: string;
            programme?: string;
            programmes?: string[];
            permissions?: string[];
        };

        // Fetch fresh permissions from DB for the role
        const roleData = await Role.findOne({ name: decoded.role.toLowerCase() });
        const permissions = roleData ? roleData.permissions : [];

        console.log(`[authenticate] User: ${decoded.id}, Role: ${decoded.role}, Found Permissions: ${permissions.length}`);
        if (!roleData) console.warn(`[authenticate] WARNING: Role '${decoded.role}' not found in database!`);

        req.user = {
            ...decoded,
            permissions
        };
        next();
    } catch (error: any) {
        console.error('[authenticate] Error:', error.message);
        res.status(401).json({ message: 'Token verification failed, authorization denied' });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized to access this resource' });
        }

        next();
    };
};

export const hasPermission = (permission: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Admin has all permissions
        if (req.user.role === 'admin') return next();

        console.log(`[hasPermission] Checking '${permission}' for user ${req.user.id} (${req.user.role}). User permissions:`, req.user.permissions);

        if (req.user.permissions && req.user.permissions.includes(permission)) {
            return next();
        }

        console.log(`[hasPermission] REJECTED: '${permission}' missing from:`, req.user.permissions);
        res.status(403).json({ message: `Access denied. Permission '${permission}' required.` });
    };
};
