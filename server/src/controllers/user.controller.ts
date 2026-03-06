import { Response } from 'express';
import User from '../models/User.model';
import Feedback from '../models/Feedback.model';
import { AuthRequest } from '../middleware/auth.middleware';
import emailService from '../services/email.service';

// Get all users (Admin only)
export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all feedback (Admin only)
export const getAllFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const feedback = await Feedback.find().sort({ createdAt: -1 });
        res.json(feedback);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Submit feedback (All authenticated users)
export const submitFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const { subject, message, category } = req.body;
        const userId = req.user!.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Save to database
        const feedback = new Feedback({
            user: userId,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            category: category || 'General',
            subject: subject || 'New User Feedback',
            message
        });
        await feedback.save();

        // Send email to admin
        const adminUsers = await User.find({ role: 'admin' });
        const adminEmails = adminUsers.map(admin => admin.email);

        if (adminEmails.length > 0) {
            await emailService.sendEmail(adminEmails.join(','), 'feedback', {
                userName: user.name,
                userEmail: user.email,
                subject: subject || 'New User Feedback',
                message,
                category: category || 'General'
            });
        }

        // Send confirmation to user
        await emailService.sendEmail(user.email, 'feedback_confirmation', {
            name: user.name,
            subject: subject || 'Feedback Received'
        });

        res.json({ message: 'Feedback submitted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error submitting feedback', error: error.message });
    }
};

// Get user by ID (Admin/Facilitator)
export const getUserById = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update user (Admin only)
export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const { username, password, programmes, ...updates } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Handle username update with uniqueness check
        if (username && username !== user.username) {
            const existing = await User.findOne({ username: username.toLowerCase() });
            if (existing) {
                return res.status(400).json({ message: 'Username is already taken' });
            }
            user.username = username;
        }

        // Handle password update
        if (password) {
            user.password = password;
        }

        // Handle programmes update
        if (programmes) {
            user.programmes = programmes;
        } else if (req.body.programme) {
            user.programmes = [req.body.programme];
        }

        // Handle other updates
        const oldStatus = user.status;
        Object.assign(user, updates);

        await user.save();

        // Send notification if status changed
        if (updates.status && updates.status !== oldStatus) {
            try {
                await emailService.sendEmail(user.email, 'enrollment_notification', {
                    name: user.name,
                    status: user.status,
                    role: user.role,
                    programmes: user.programmes.join(', ')
                });
            } catch (emailErr) {
                console.error('Failed to send status update email:', emailErr);
            }
        }

        const { password: _, ...userResponse } = user.toObject();
        res.json(userResponse);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete user (Admin only)
export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Create single user (Admin only)
export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const { name, username, email, password, role, programmes, studentId } = req.body;

        const normalizedEmail = email?.toLowerCase();
        const normalizedUsername = username?.toLowerCase();

        const userExists = await User.findOne({ 
            $or: [
                { email: normalizedEmail }, 
                { username: normalizedUsername }
            ] 
        });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email or username already exists' });
        }

        const user = new User({
            name,
            username,
            email,
            password: password || 'Welcome123', // Default password
            role: role || 'student',
            programmes: programmes || (req.body.programme ? [req.body.programme] : []),
            studentId,
            status: 'enrolled'
        });

        await user.save();

        // Send enrollment email
        try {
            await emailService.sendEmail(user.email, 'enrollment_notification', {
                name: user.name,
                status: user.status,
                role: user.role,
                programmes: user.programmes.join(', ')
            });
        } catch (emailErr) {
            console.error('Failed to send enrollment email:', emailErr);
        }

        const { password: _, ...userResponse } = user.toObject();
        res.status(201).json(userResponse);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Bulk create users (Admin only)
export const bulkCreateUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { users, defaultPassword } = req.body;

        if (!Array.isArray(users)) {
            return res.status(400).json({ message: 'Users must be an array' });
        }

        const results = {
            created: 0,
            failed: 0,
            errors: [] as string[]
        };

        for (const userData of users) {
            try {
                const normalizedEmail = userData.email?.toLowerCase().trim();
                const normalizedUsername = userData.username?.toLowerCase().trim();

                // Check if user exists
                const existing = await User.findOne({
                    $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
                });

                if (existing) {
                    results.failed++;
                    results.errors.push(`User ${userData.username || userData.email} already exists`);
                    continue;
                }

                const user = new User({
                    ...userData,
                    programmes: userData.programmes || (userData.programme ? [userData.programme] : []),
                    password: userData.password || defaultPassword || 'Welcome123',
                    status: 'enrolled'
                });

                await user.save();

                // Send enrollment email
                try {
                    await emailService.sendEmail(user.email, 'enrollment_notification', {
                        name: user.name,
                        status: user.status,
                        role: user.role,
                        programmes: user.programmes.join(', ')
                    });
                } catch (emailErr) {
                    console.error('Failed to send enrollment email during bulk create:', emailErr);
                }

                results.created++;
            } catch (err: any) {
                results.failed++;
                results.errors.push(`Error creating ${userData.username || userData.email}: ${err.message}`);
            }
        }

        res.status(201).json(results);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
