import { Response } from 'express';
import Booking from '../models/Booking.model';
import Lab from '../models/Lab.model';
import { AuthRequest } from '../middleware/auth.middleware';
import emailService from '../services/email.service';

// Create a booking
export const createBooking = async (req: AuthRequest, res: Response) => {
    try {
        const { lab, startTime, endTime, purpose } = req.body;

        // Check if lab exists
        const labExists = await Lab.findById(lab);
        if (!labExists) {
            return res.status(404).json({ message: 'Lab not found' });
        }

        // Check if user is authorized for this lab type based on their programme
        if (req.user && req.user.role === 'student') {
            const userProgrammes = req.user.programmes || [];
            const typeMapping: { [key: string]: string } = {
                'Artificial Intelligence': 'AI',
                'Cybersecurity': 'Cybersecurity',
                'Management Information System': 'MIS'
            };
            const allowedTypes = userProgrammes.map(p => typeMapping[p]).filter(Boolean);
            
            if (!allowedTypes.includes(labExists.type)) {
                return res.status(403).json({ 
                    message: `Access denied. This lab is for ${labExists.type} students only.` 
                });
            }
        }

        // Check for conflicts and capacity
        const activeBookingsAtTime = await Booking.countDocuments({
            lab,
            status: { $in: ['confirmed', 'active'] },
            $or: [
                { startTime: { $lt: endTime, $gte: startTime } },
                { endTime: { $gt: startTime, $lte: endTime } },
                { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
            ],
        });

        // Default status is always pending for approval for students/facilitators
        const status = req.user?.role === 'admin' ? 'confirmed' : 'pending';
        let message = status === 'pending' 
            ? 'Booking request submitted. Please wait for Admin approval.' 
            : 'Booking confirmed.';

        // Check for conflicts (still useful to warn if full, but we don't auto-confirm)
        if (activeBookingsAtTime >= labExists.capacity) {
            message = 'Lab is at capacity for this time slot. Your request is pending availability review.';
        }

        const booking = new Booking({
            user: req.user?.id,
            lab,
            startTime,
            endTime,
            purpose,
            status,
        });

        await booking.save();
        const populatedBooking = await Booking.findById(booking._id)
            .populate('lab', 'name type')
            .populate('user', 'name email');

        res.status(201).json({
            ...populatedBooking?.toObject(),
            message: message || 'Booking successful'
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get user's bookings
export const getMyBookings = async (req: AuthRequest, res: Response) => {
    try {
        const bookings = await Booking.find({ user: req.user?.id })
            .populate('lab', 'name type')
            .sort({ startTime: -1 });
        res.json(bookings);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all bookings (Admin/Facilitator)
export const getAllBookings = async (req: AuthRequest, res: Response) => {
    try {
        const bookings = await Booking.find()
            .populate('lab', 'name type')
            .populate('user', 'name email')
            .sort({ startTime: -1 });
        res.json(bookings);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Cancel booking
export const cancelBooking = async (req: AuthRequest, res: Response) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('user lab');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if user owns the booking or is admin
        if (booking.user._id.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        booking.status = 'cancelled';
        await booking.save();

        // Send cancellation email
        const user = booking.user as any;
        const lab = booking.lab as any;
        try {
            await emailService.sendEmail(user.email, 'booking_cancelled', {
                name: user.name,
                labName: lab.name,
                startTime: booking.startTime.toLocaleString(),
                adminNote: 'Cancelled by user/admin'
            });
        } catch (emailErr) {
            console.error('Failed to send cancellation email:', emailErr);
        }

        res.json(booking);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Request Lab Instance (Student)
export const requestLabInstance = async (req: AuthRequest, res: Response) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Verify ownership
        if (booking.user.toString() !== req.user?.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Must be confirmed first
        if (booking.status !== 'confirmed') {
            return res.status(400).json({ message: 'Booking must be confirmed before requesting lab instance' });
        }

        booking.status = 'requested';
        await booking.save();

        res.json({ message: 'Lab instance requested. Admin will provision your access soon.', status: 'requested' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Grant Lab Instance (Admin)
export const grantLabInstance = async (req: AuthRequest, res: Response) => {
    try {
        const { provisionedUrl, adminNote } = req.body;
        const booking = await Booking.findById(req.params.id).populate('user lab');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.status !== 'requested' && booking.status !== 'confirmed') {
            return res.status(400).json({ message: 'Lab can only be granted for requested or confirmed bookings' });
        }

        booking.status = 'granted';
        booking.provisionedUrl = provisionedUrl;
        booking.provisionedAt = new Date();
        if (adminNote) booking.adminNote = adminNote;

        await booking.save();

        // Notify user
        const user = booking.user as any;
        const lab = booking.lab as any;
        try {
            await emailService.sendEmail(user.email, 'booking_confirmed', {
                name: user.name,
                labName: lab.name,
                startTime: booking.startTime.toLocaleString(),
                endTime: booking.endTime.toLocaleString(),
                adminNote: `Your lab instance is ready! Access it at: ${provisionedUrl}. ${adminNote || ''}`
            });
        } catch (emailErr) {
            console.error('Failed to send grant email:', emailErr);
        }

        res.json(booking);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update booking (Admin only for critical status changes)
export const updateBooking = async (req: AuthRequest, res: Response) => {
    try {
        const { status, endTime, adminNote, provisionedUrl } = req.body;

        const booking = await Booking.findById(req.params.id).populate('user lab');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // --- CRITICAL PROTECTION: Only Admins/Facilitators can confirm or cancel others' bookings ---
        if (req.user?.role !== 'admin' && req.user?.role !== 'facilitator' && status && status !== booking.status) {
            return res.status(403).json({ message: 'Access denied. Only administrators and facilitators can approve or deny bookings.' });
        }

        const oldStatus = booking.status;

        if (status) {
            const validStatuses = ['confirmed', 'pending', 'cancelled', 'completed', 'requested', 'granted'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }
            booking.status = status;
            // Auto-generate note if not provided
            if (!adminNote) {
                if (status === 'confirmed') booking.adminNote = 'Access Granted';
                if (status === 'cancelled') booking.adminNote = 'Request Denied';
            }
        }

        if (adminNote) {
            booking.adminNote = adminNote;
        }

        if (provisionedUrl) {
            booking.provisionedUrl = provisionedUrl;
            booking.provisionedAt = new Date();
        }

        if (endTime) {
            const newEndTime = new Date(endTime);
            if (newEndTime <= booking.startTime) {
                return res.status(400).json({ message: 'End time must be after start time' });
            }
            booking.endTime = newEndTime;
            booking.adminNote = `Time extended until ${newEndTime.toLocaleTimeString()}`;
        }

        await booking.save();

        // Send notification on status change
        if (status && status !== oldStatus) {
            const user = booking.user as any;
            const lab = booking.lab as any;
            let template = '';
            if (status === 'confirmed') template = 'booking_confirmed';
            else if (status === 'cancelled') template = 'booking_cancelled';
            else if (status === 'completed') template = 'booking_completed';

            if (template) {
                try {
                    await emailService.sendEmail(user.email, template, {
                        name: user.name,
                        labName: lab.name,
                        startTime: booking.startTime.toLocaleString(),
                        endTime: booking.endTime.toLocaleString(),
                        adminNote: booking.adminNote
                    });
                } catch (emailErr) {
                    console.error(`Failed to send ${template} email:`, emailErr);
                }
            }
        }

        const populatedBooking = await Booking.findById(booking._id)
            .populate('lab', 'name type')
            .populate('user', 'name email');

        res.json(populatedBooking);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete/Archive Booking (Admin only)
export const deleteBooking = async (req: AuthRequest, res: Response) => {
    try {
        const { reason, action = 'archive' } = req.body;
        
        const booking = await Booking.findById(req.params.id).populate('user lab');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Restriction: ONLY admins can delete bookings
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Only administrators can perform this action.' });
        }

        const auditLogService = (await import('../services/audit-log.service')).default;

        if (action === 'permanent') {
            // Log the permanent deletion
            await auditLogService.log({
                userId: req.user.id,
                eventType: 'security_alert',
                severity: 'critical',
                message: `Booking PERMANENTLY DELETED for ${(booking.user as any).name}. Reason: ${reason || 'N/A'}`,
                eventData: { bookingId: booking._id, reason, action: 'permanent' },
                req
            });
            await Booking.findByIdAndDelete(req.params.id);
            res.json({ message: 'Booking permanently deleted' });
        } else {
            // Archive logic (set status to cancelled)
            booking.status = 'cancelled';
            if (!booking.adminNote) booking.adminNote = `Archived: ${reason || 'Admin Action'}`;
            await booking.save();

            // Log the archive action
            await auditLogService.log({
                userId: req.user.id,
                eventType: 'security_alert',
                severity: 'warning',
                message: `Booking ARCHIVED (Cancelled) for ${(booking.user as any).name}. Reason: ${reason || 'N/A'}`,
                eventData: { bookingId: booking._id, reason, action: 'archive' },
                req
            });
            res.json({ message: 'Booking archived successfully (status set to cancelled)' });
        }
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
