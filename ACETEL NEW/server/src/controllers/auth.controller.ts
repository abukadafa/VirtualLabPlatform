import { Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';
import emailService from '../services/email.service';
import auditLogService from '../services/audit-log.service';

// Register a new user
export const register = async (req: AuthRequest, res: Response) => {
    try {
        const { name, username, email, password, role, programmes, studentId } = req.body;

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
            role: 'student', // Force student role for security (D2)
            programmes: programmes || [],
            studentId,
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role, programmes: user.programmes },
            process.env.JWT_SECRET!, // No fallback allowed (D6)
            { expiresIn: '7d' }
        );

        // Send welcome email
        try {
            await emailService.sendEmail(user.email, 'welcome', { name: user.name });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                programmes: user.programmes,
                studentId: user.studentId,
                enrolledLabs: user.enrolledLabs || []
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
        const normalizedIdentifier = identifier.toLowerCase().trim();

        // Check if user exists
        const user = await User.findOne({
            $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }]
        });

        if (!user) {
            await auditLogService.logAuthAttempt(undefined, normalizedIdentifier, false, 'User not found', req.ip);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check for account lockout (D2)
        if (user.isLocked()) {
            return res.status(423).json({
                message: 'Account temporarily locked due to too many failed attempts. Please try again later.'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            // Increment failed attempts
            user.failedAttempts += 1;
            if (user.failedAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
            }
            await auditLogService.logAuthAttempt(String(user._id), normalizedIdentifier, false, 'Invalid password', req.ip);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Reset failed attempts on successful login
        if (user.failedAttempts > 0) {
            user.failedAttempts = 0;
            user.lockUntil = undefined;
            await user.save();
        }

        await auditLogService.logAuthAttempt(String(user._id), normalizedIdentifier, true, 'Login successful', req.ip);

        // Verify role - Make it informative rather than strictly blocking if password is correct
        // but for security, if they requested a specific role, we should enforce it
        // HOWEVER, to be "more allowing", we'll check if the provided role matches.
        if (role && user.role !== role) {
            return res.status(401).json({
                message: `Access denied. You are registered as a ${user.role}, but you selected ${role}. Please select the correct role.`,
                suggestedRole: user.role
            });
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
            { id: user._id, role: user.role, programmes: user.programmes },
            process.env.JWT_SECRET!, // No fallback allowed (D6)
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                programmes: user.programmes,
                studentId: user.studentId,
                enrolledLabs: user.enrolledLabs || []
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

// Forgot Password - Generate reset token and send email
export const forgotPassword = async (req: AuthRequest, res: Response) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No user found with that email address' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

        await user.save();

        // Create reset URL
        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

        // Send email
        try {
            await emailService.sendEmail(user.email, 'password_reset', {
                name: user.name,
                resetLink: resetUrl
            });

            res.json({ message: 'Password reset email sent successfully' });
        } catch (emailError) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            throw emailError;
        }
    } catch (error: any) {
        res.status(500).json({ message: 'Error sending password reset email', error: error.message });
    }
};

// Reset Password - Validate token and update password
export const resetPassword = async (req: AuthRequest, res: Response) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Hash the token from URL to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Update password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
};
