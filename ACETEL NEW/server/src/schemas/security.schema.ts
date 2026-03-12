import { z } from 'zod';

export const loginSchema = z.object({
    body: z.object({
        identifier: z.string().min(1, 'Email or username is required'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        role: z.enum(['student', 'facilitator', 'admin']).optional(),
    }),
});

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name is required'),
        username: z.string().min(3, 'Username must be at least 3 characters'),
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        role: z.string().optional(), // Will be forced to student in controller
        programmes: z.array(z.string()).optional(),
        studentId: z.string().optional(),
    }),
});

export const labStartSchema = z.object({
    params: z.object({
        id: z.string().length(24, 'Invalid Lab ID format'),
    }),
});

export const updateUserSchema = z.object({
    params: z.object({
        id: z.string().length(24, 'Invalid User ID format'),
    }),
    body: z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(['student', 'facilitator', 'admin']).optional(),
        status: z.enum(['enrolled', 'completed', 'inactive']).optional(),
        studentId: z.string().optional(),
    }),
});
