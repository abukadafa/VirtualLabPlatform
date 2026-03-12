import { Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.model';
import Role from '../models/Role.model';
import { AuthRequest } from '../middleware/auth.middleware';
import emailService from '../services/email.service';
import auditLogService from '../services/audit-log.service';

// Register a new user (Admin-only restricted)

// Register a new user (Restricted or Open depending on configuration)
export const register = async (req: AuthRequest, res: Response) => {
    try {
        const { name, username, email, password, role = 'student', programmes, studentId } = req.body;

        // --- SECURITY: ROLE ENFORCEMENT ---
        // If requester is not an admin, they can ONLY register as a 'student'
        const isSelfRegistration = !req.user || req.user.role !== 'admin';
        const targetRole = isSelfRegistration ? 'student' : role;

        if (isSelfRegistration && role !== 'student') {
            return res.status(403).json({ 
                message: 'Access denied. Only administrators can assign privileged roles.' 
            });
        }

        const normalizedEmail = email?.toLowerCase().trim();
        const normalizedUsername = username?.toLowerCase().trim();

        // Check if user already exists
        const userExists = await User.findOne({
            $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
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
            role: targetRole,
            programmes: programmes || [],
            studentId,
        });

        await user.save();

        // Fetch permissions for the role
        const roleData = await Role.findOne({ name: user.role });
        const permissions = roleData ? roleData.permissions : [];

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('CRITICAL: JWT_SECRET not configured');
            return res.status(500).json({ message: 'Internal server configuration error' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role, programmes: user.programmes, permissions },
            jwtSecret,
            { expiresIn: '7d' }
        );

        // Send enrollment email
        try {
            await emailService.sendEmail(user.email, 'enrollment_notification', { 
                name: user.name,
                status: user.status,
                role: user.role,
                programmes: user.programmes.join(', ')
            });
        } catch (emailError) {
            console.error('Failed to send enrollment email:', emailError);
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
                permissions
            },
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Login user
export const login = async (req: AuthRequest, res: Response) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier) {
            return res.status(400).json({ message: 'Email or username is required' });
        }

        const normalizedIdentifier = identifier.toLowerCase().trim();

        // Check if user exists
        const user = await User.findOne({
            $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }]
        });

        if (!user) {
            await auditLogService.logLoginFailure(undefined, `User not found: ${normalizedIdentifier}`, req);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            await auditLogService.logLoginFailure(user._id.toString(), 'Invalid password', req);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check status (Admins bypass, others must be enrolled or completed)
        if (user.role !== 'admin' && !['enrolled', 'completed'].includes(user.status)) {
            await auditLogService.logLoginFailure(user._id.toString(), `Account status: ${user.status}`, req);
            return res.status(403).json({
                message: `Your account status is '${user.status}'. Please contact the administrator.`,
                status: user.status
            });
        }

        // Fetch permissions for the role
        const roleData = await Role.findOne({ name: user.role });
        const permissions = roleData ? roleData.permissions : [];

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('CRITICAL: JWT_SECRET not configured');
            return res.status(500).json({ message: 'Internal server configuration error' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role, programmes: user.programmes, permissions },
            jwtSecret,
            { expiresIn: '7d' }
        );

        await auditLogService.logLoginSuccess(user._id.toString(), req);

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                programmes: user.programmes,
                studentId: user.studentId,
                permissions
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

        // Fetch permissions for the role
        const roleData = await Role.findOne({ name: user.role });
        const permissions = roleData ? roleData.permissions : [];

        res.json({
            ...user.toObject(),
            id: user._id,
            permissions
        });
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
