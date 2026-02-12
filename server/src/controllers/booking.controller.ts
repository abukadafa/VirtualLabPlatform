import { Response } from 'express';
import Booking from '../models/Booking.model';
import Lab from '../models/Lab.model';
import { AuthRequest } from '../middleware/auth.middleware';

// Create a booking
export const createBooking = async (req: AuthRequest, res: Response) => {
    try {
        const { lab, startTime, endTime, purpose } = req.body;

        // Check if lab exists
        const labExists = await Lab.findById(lab);
        if (!labExists) {
            return res.status(404).json({ message: 'Lab not found' });
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

        // Default status is always pending for approval
        let status: 'confirmed' | 'pending' = 'pending';
        let message = 'Booking request submitted. Please wait for Admin approval.';

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
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if user owns the booking or is admin
        if (booking.user.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        booking.status = 'cancelled';
        await booking.save();
        res.json(booking);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update booking (Admin/Facilitator only)
export const updateBooking = async (req: AuthRequest, res: Response) => {
    try {
        const { status, endTime, adminNote } = req.body;

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (status) {
            if (!['confirmed', 'pending', 'cancelled', 'completed'].includes(status)) {
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

        if (endTime) {
            const newEndTime = new Date(endTime);
            if (newEndTime <= booking.startTime) {
                return res.status(400).json({ message: 'End time must be after start time' });
            }
            booking.endTime = newEndTime;
            booking.adminNote = `Time extended until ${newEndTime.toLocaleTimeString()}`;
        }

        await booking.save();

        const populatedBooking = await Booking.findById(booking._id)
            .populate('lab', 'name type')
            .populate('user', 'name email');

        res.json(populatedBooking);
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
