import { Response } from 'express';
import User from '../models/User.model';
import Feedback from '../models/Feedback.model';
import { AuthRequest } from '../middleware/auth.middleware';
import emailService from '../services/email.service';

const isStudentUser = (user: { role?: string }) => user.role === 'student';

// Get all users (Admin only / Facilitators see students in their programmes)
export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        let query: any = { isDeleted: { $ne: true } };
        
        if (req.user?.role === 'facilitator') {
            query = {
                ...query,
                role: 'student',
                addedBy: req.user.id
            };
        } else if (req.user?.role === 'lab technician') {
            query.role = 'student';
        } else if (req.user?.role !== 'admin' && req.user?.role !== 'lab technician') {
            // Other roles (like students) shouldn't even reach here due to route guards, 
            // but just in case, only show themselves
            query._id = req.user!.id;
        }

        const users = await User.find(query).select('-password');
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all deleted users (Recycle Bin - Admin only)
export const getAllDeletedUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.find({ isDeleted: true }).select('-password');
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

        // Send email to admin (Optional)
        try {
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
        } catch (err: any) {
            console.error('[Feedback Email] Admin alert failed:', err.message);
        }

        // Send confirmation to user (Optional)
        try {
            await emailService.sendEmail(user.email, 'feedback_confirmation', {
                name: user.name,
                subject: subject || 'Feedback Received'
            });
        } catch (err: any) {
            console.error('[Feedback Email] User confirmation failed:', err.message);
        }

        return res.json({ message: 'Feedback submitted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error submitting feedback', error: error.message });
    }
};

// Delete/Archive Feedback (Admin only)
export const deleteFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const { reason } = req.body;
        if (!reason || reason.trim().length < 5) {
            return res.status(400).json({ message: 'A valid reason (min 5 characters) is required for audit trails.' });
        }

        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) {
            return res.status(404).json({ message: 'Feedback record not found' });
        }

        const auditLogService = (await import('../services/audit-log.service')).default;
        await auditLogService.log({
            userId: req.user!.id,
            eventType: 'data_deletion',
            severity: 'warning',
            message: `Feedback Purged: "${feedback.subject}" from ${feedback.userName}. Reason: ${reason}`,
            eventData: { feedbackId: feedback._id, reason },
            req
        });

        await Feedback.findByIdAndDelete(req.params.id);
        res.json({ message: 'Feedback record permanently removed from system.' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error during feedback purge', error: error.message });
    }
};

// Bulk Delete Feedback (Admin only)
export const bulkDeleteFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const { feedbackIds, reason } = req.body;

        if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
            return res.status(400).json({ message: 'Select at least one feedback record.' });
        }

        if (!reason || reason.trim().length < 5) {
            return res.status(400).json({ message: 'A valid reason (min 5 characters) is required for bulk actions.' });
        }

        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const auditLogService = (await import('../services/audit-log.service')).default;
        await auditLogService.log({
            userId: req.user!.id,
            eventType: 'data_deletion',
            severity: 'warning',
            message: `Bulk Feedback Purged: ${feedbackIds.length} records. Reason: ${reason}`,
            eventData: { count: feedbackIds.length, reason },
            req
        });

        await Feedback.deleteMany({ _id: { $in: feedbackIds } });
        res.json({ message: `Successfully purged ${feedbackIds.length} feedback records.` });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error during bulk feedback purge', error: error.message });
    }
};

// Get user by ID (Admin/Facilitator)
export const getUserById = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.user?.role !== 'admin' && !isStudentUser(user)) {
            return res.status(403).json({ message: 'Access denied. Only administrators can manage staff accounts.' });
        }

        if (req.user?.role === 'facilitator') {
            const facilitatorProgrammes = req.user.programmes || [];
            const hasCommonProgramme = user.programmes.some(p => facilitatorProgrammes.includes(p));
            const isCreator = user.addedBy === req.user.id;

            if (!hasCommonProgramme && !isCreator) {
                return res.status(403).json({ message: 'Access denied. You do not have permission to view this user.' });
            }
        } else if (req.user?.role !== 'admin' && req.user?.role !== 'lab technician') {
            // Other roles (like students) can only see themselves
            if (user._id.toString() !== req.user?.id) {
                return res.status(403).json({ message: 'Access denied.' });
            }
        }

        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

        // Update user (Admin/Facilitator with permission)
export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            username, 
            password, 
            email, 
            role, 
            status, 
            programmes, 
            studentId, 
            completionDate,
            lastEnrollmentDate
        } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isAdmin = req.user?.role === 'admin';
        const isFacilitator = req.user?.role === 'facilitator';

        // Restriction: Non-admins can only edit student accounts
        if (!isAdmin && !isStudentUser(user)) {
            return res.status(403).json({ message: 'Access denied. You can only edit student accounts.' });
        }

        if (isFacilitator) {
            const facilitatorProgrammes = req.user?.programmes || [];
            const hasCommonProgramme = user.programmes.some(p => facilitatorProgrammes.includes(p));
            const isCreator = user.addedBy === req.user?.id;

            if (!hasCommonProgramme && !isCreator) {
                return res.status(403).json({ message: 'Access denied. You can only edit students in your assigned programmes or those you created.' });
            }

            // Facilitators cannot change roles
            if (role && role !== 'student') {
                return res.status(403).json({ message: 'Access denied. You cannot assign non-student roles.' });
            }

            // Facilitators cannot change status to administrative ones or change critical enrollment dates
            if (status && !['enrolled', 'completed', 'inactive'].includes(status)) {
                 return res.status(403).json({ message: 'Access denied. Invalid status assignment.' });
            }
        }

        // Handle username update with uniqueness check
        if (username && username !== user.username) {
            const existing = await User.findOne({ username: username.toLowerCase() });
            if (existing && existing._id.toString() !== id) {
                return res.status(400).json({ message: 'Username is already taken' });
            }
            user.username = username.toLowerCase();
        }

        // Handle email update with uniqueness check
        if (email && email !== user.email) {
            const existing = await User.findOne({ email: email.toLowerCase() });
            if (existing && existing._id.toString() !== id) {
                return res.status(400).json({ message: 'Email is already taken' });
            }
            user.email = email.toLowerCase();
        }

        // Basic Info Updates (Allowed for Admin and authorized Facilitators)
        if (name) user.name = name;
        if (password) user.password = password;
        if (studentId !== undefined) user.studentId = studentId;

        // Restricted Updates (Admin Only)
        if (isAdmin) {
            if (role) user.role = role;
            if (status) {
                if (status === 'suspended') user.status = 'inactive';
                else if (status === 'graduated') user.status = 'completed';
                else user.status = status;
            }
            if (completionDate) user.completionDate = completionDate;
            if (lastEnrollmentDate) user.lastEnrollmentDate = lastEnrollmentDate;
        } else if (isFacilitator) {
            // Facilitators can update status to enrolled/completed/inactive
            if (status) {
                if (status === 'suspended') user.status = 'inactive';
                else if (status === 'graduated') user.status = 'completed';
                else user.status = status;
            }
        }

        // Programmes update with restriction for facilitators
        if (programmes) {
            if (isFacilitator) {
                const facilitatorProgrammes = req.user?.programmes || [];
                const invalidProgs = programmes.filter((p: string) => !facilitatorProgrammes.includes(p));
                if (invalidProgs.length > 0) {
                    return res.status(403).json({ message: `Access denied. You cannot assign these programmes: ${invalidProgs.join(', ')}` });
                }
            }
            user.programmes = programmes;
        }

        const oldStatus = user.status;
        await user.save();

        // Send notification if status changed
        if (status && status !== oldStatus) {
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

// Delete user (Soft-delete by default - Recycle Bin)
export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const { reason, action = 'soft' } = req.body; // action: 'soft' or 'permanent'
        
        if (!reason || reason.trim().length < 5) {
            return res.status(400).json({ message: 'A valid reason (min 5 characters) is required.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user._id.toString() === req.user!.id) {
            return res.status(403).json({ message: 'You cannot delete your own administrative account.' });
        }

        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only administrators can perform this action.' });
        }

        const auditLogService = (await import('../services/audit-log.service')).default;

        if (action === 'permanent') {
            await auditLogService.log({
                userId: req.user.id,
                eventType: 'security_alert',
                severity: 'critical',
                message: `User PERMANENTLY DELETED: ${user.name} (@${user.username}). Reason: ${reason}`,
                eventData: { deletedUserId: user._id, reason, action: 'permanent' },
                req
            });
            await User.findByIdAndDelete(req.params.id);
            res.json({ message: 'User permanently removed from system.' });
        } else {
            // Soft Delete (Recycle Bin)
            user.isDeleted = true;
            user.deletedAt = new Date();
            user.deletionReason = reason;
            await user.save();

            await auditLogService.log({
                userId: req.user.id,
                eventType: 'data_deletion',
                severity: 'warning',
                message: `User moved to Recycle Bin: ${user.name} (@${user.username}). Reason: ${reason}`,
                eventData: { deletedUserId: user._id, reason, action: 'soft' },
                req
            });
            res.json({ message: 'User moved to Recycle Bin successfully.' });
        }
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Restore User from Recycle Bin (Admin only)
export const restoreUser = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only administrators can restore accounts.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isDeleted = false;
        user.deletedAt = undefined;
        user.deletionReason = undefined;
        await user.save();

        const auditLogService = (await import('../services/audit-log.service')).default;
        await auditLogService.log({
            userId: req.user.id,
            eventType: 'security_alert',
            severity: 'info',
            message: `User RESTORED from Recycle Bin: ${user.name} (@${user.username})`,
            eventData: { restoredUserId: user._id },
            req
        });

        res.json({ message: 'User restored successfully.' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Bulk Delete/Archive Users (Admin only)
export const bulkDeleteUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { userIds, reason, action = 'soft' } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'Select at least one user.' });
        }

        if (!reason || reason.trim().length < 5) {
            return res.status(400).json({ message: 'A valid reason is required for bulk actions.' });
        }

        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        // Filter out the current admin from the list to prevent self-deletion
        const targetIds = userIds.filter(id => id !== req.user!.id);

        if (action === 'permanent') {
            await User.deleteMany({ _id: { $in: targetIds } });
        } else {
            await User.updateMany(
                { _id: { $in: targetIds } },
                { 
                    $set: { 
                        isDeleted: true, 
                        deletedAt: new Date(), 
                        deletionReason: reason 
                    } 
                }
            );
        }

        const auditLogService = (await import('../services/audit-log.service')).default;
        await auditLogService.log({
            userId: req.user.id,
            eventType: 'security_alert',
            severity: 'critical',
            message: `Bulk ${action === 'permanent' ? 'Permanent Delete' : 'Recycle Bin'} performed on ${targetIds.length} users. Reason: ${reason}`,
            eventData: { count: targetIds.length, action },
            req
        });

        res.json({ message: `Successfully processed ${targetIds.length} accounts.` });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error during bulk operation', error: error.message });
    }
};

// Create single user (Admin/Facilitator with permission)
export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        console.log(`[createUser] User ${req.user?.id} (${req.user?.role}) attempting to create user. Body:`, JSON.stringify(req.body));
        const { name, username, email, password, role, programmes, studentId } = req.body;

        // Restriction: Non-admins can only create students
        if (req.user?.role !== 'admin' && role && role !== 'student') {
            console.log(`[createUser] Access denied: User ${req.user?.id} attempted to create a non-student role: ${role}`);
            return res.status(403).json({ message: 'Access denied. You can only create student accounts.' });
        }

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
            username: normalizedUsername,
            email: normalizedEmail,
            password: password || 'Welcome123', // Default password
            role: role || 'student',
            programmes: programmes || (req.body.programme ? [req.body.programme] : []),
            studentId,
            status: 'enrolled',
            addedBy: req.user?.id
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
                // Restriction: Non-admins can only create students
                if (req.user?.role !== 'admin' && userData.role && userData.role !== 'student') {
                    results.failed++;
                    results.errors.push(`Access denied for ${userData.username || userData.email}. You can only create student accounts.`);
                    continue;
                }

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
                    username: normalizedUsername,
                    email: normalizedEmail,
                    programmes: userData.programmes || (userData.programme ? [userData.programme] : []),
                    password: userData.password || defaultPassword || 'Welcome123',
                    status: 'enrolled',
                    addedBy: req.user?.id
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

// Bulk Notify Users
export const bulkNotifyUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { userIds } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'Select at least one user.' });
        }

        const users = await User.find({ _id: { $in: userIds } });
        let sent = 0;
        let failed = 0;

        for (const user of users) {
            try {
                await emailService.sendEmail(user.email, 'enrollment_notification', {
                    name: user.name,
                    status: user.status,
                    role: user.role,
                    programmes: user.programmes.join(', ')
                });
                sent++;
            } catch (err) {
                console.error(`Failed to notify ${user.email}:`, err);
                failed++;
            }
        }

        res.json({ message: `Notification process completed. Sent: ${sent}, Failed: ${failed}` });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error during bulk notification', error: error.message });
    }
};

// Bulk Update Status (e.g., disable/graduated)
export const bulkUpdateStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { userIds, status } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'Select at least one user.' });
        }
        
        // Map UI statuses to model statuses if needed
        let targetStatus = status;
        if (status === 'suspended') targetStatus = 'inactive';
        else if (status === 'graduated') targetStatus = 'completed';

        if (!['enrolled', 'completed', 'inactive'].includes(targetStatus)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const isAdmin = req.user?.role === 'admin';
        const isFacilitator = req.user?.role === 'facilitator';

        const users = await User.find({ _id: { $in: userIds } });
        const targetIds = [];

        for (const user of users) {
            if (isAdmin) {
                targetIds.push(user._id);
            } else if (isFacilitator && user.role === 'student') {
                 const facilitatorProgrammes = req.user?.programmes || [];
                 const hasCommonProgramme = user.programmes.some(p => facilitatorProgrammes.includes(p));
                 const isCreator = user.addedBy === req.user?.id;
                 if (hasCommonProgramme || isCreator) {
                     targetIds.push(user._id);
                 }
            } else if (req.user?.role === 'lab technician' && user.role === 'student') {
                targetIds.push(user._id);
            }
        }

        if (targetIds.length === 0) {
            return res.status(403).json({ message: 'No authorized users found in selection for this action.' });
        }

        await User.updateMany({ _id: { $in: targetIds } }, { $set: { status: targetStatus } });

        res.json({ message: `Successfully updated status to ${status} for ${targetIds.length} users.` });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error during bulk status update', error: error.message });
    }
};
