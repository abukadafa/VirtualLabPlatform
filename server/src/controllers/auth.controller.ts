import { Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';

// Register a new user
export const register = async (req: AuthRequest, res: Response) => {
    try {
        const { name, username, email, password, role, programme, studentId } = req.body;

        // Check if user already exists
        const userExists = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (userExists) {
            return res.status(400).json({
                message: userExists.email === email ? 'User with this email already exists' : 'Username already taken'
            });
        }

        // Create new user
        const user = new User({
            name,
            username,
            email,
            password,
            role: role || 'student',
            programme,
            studentId,
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role, programme: user.programme },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                programme: user.programme,
                studentId: user.studentId,
            },
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Login user
export const login = async (req: AuthRequest, res: Response) => {
    try {
        const { identifier, password, role } = req.body;

        // Check if user exists
        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify role
        if (role && user.role !== role) {
            return res.status(401).json({ message: `Access denied. You are not a ${role}.` });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check enrollment status
        if (user.status !== 'enrolled') {
            return res.status(403).json({
                message: 'Your account is not currently enrolled. Please contact the administrator.',
                status: user.status
            });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role, programme: user.programme },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                programme: user.programme,
                studentId: user.studentId,
            },
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get current user
export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user?.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
