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

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No authentication token, access denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
            id: string;
            role: string;
            programme?: string;
            programmes?: string[];
        };

        req.user = decoded;
        next();
    } catch (error) {
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
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Admin has all permissions
        if (req.user.role === 'admin') return next();

        try {
            const roleData = await Role.findOne({ name: req.user.role });
            if (!roleData) {
                return res.status(403).json({ message: 'Role not found' });
            }

            if (roleData.permissions.includes(permission)) {
                return next();
            }

            res.status(403).json({ message: `Access denied. Permission '${permission}' required.` });
        } catch (error) {
            res.status(500).json({ message: 'Server error checking permissions' });
        }
    };
};
