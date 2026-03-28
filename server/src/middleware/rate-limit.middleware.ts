import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for lab start requests
 * Prevents abuse by limiting lab starts per user
 */
export const labStartRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 lab starts per 15 min per user
    message: 'Too many lab requests from this account. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { 
        xForwardedForHeader: false,
        keyGeneratorIpFallback: false
    },
    // Key by user ID instead of IP
    keyGenerator: (req: Request) => {
        // Assumes auth middleware has run and attached user to request
        const authReq = req as any;
        return authReq.user?.id || req.ip;
    },
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            message: 'Too many lab requests. Please wait before starting another session.',
            retryAfter: Math.ceil(15 * 60), // seconds
        });
    },
});

/**
 * Rate limiter for general API requests
 */
export const apiRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Max 100 requests per minute
    message: 'Too many requests from this IP. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { 
        xForwardedForHeader: false,
        keyGeneratorIpFallback: false
    },
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            message: 'Too many requests from this IP. Please try again later.',
        });
    },
});

/**
 * Rate limiter for authentication endpoints
 */
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased from 5 to 100 to prevent blocking legitimate users
    message: 'Too many authentication attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    validate: { 
        xForwardedForHeader: false,
        keyGeneratorIpFallback: false
    },
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            message: 'Too many authentication attempts. Please try again later.',
        });
    },
});
