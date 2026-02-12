import { Response } from 'express';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';

// Get all users (Admin only)
export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
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
        const { username, password, ...updates } = req.body;

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

        // Handle other updates
        Object.assign(user, updates);

        await user.save();

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
        const { name, username, email, password, role, programme, studentId } = req.body;

        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email or username already exists' });
        }

        const user = new User({
            name,
            username,
            email,
            password: password || 'Welcome123', // Default password
            role: role || 'student',
            programme,
            studentId,
            status: 'enrolled'
        });

        await user.save();
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
                // Check if user exists
                const existing = await User.findOne({
                    $or: [{ email: userData.email }, { username: userData.username }]
                });

                if (existing) {
                    results.failed++;
                    results.errors.push(`User ${userData.username || userData.email} already exists`);
                    continue;
                }

                const user = new User({
                    ...userData,
                    password: userData.password || defaultPassword || 'Welcome123',
                    status: 'enrolled'
                });

                await user.save();
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
