import { Response } from 'express';
import Booking from '../models/Booking.model';
import Lab from '../models/Lab.model';
import { AuthRequest } from '../middleware/auth.middleware';
import emailService from '../services/email.service';
import proxmoxService from '../services/proxmox.service';
import configService from '../services/config.service';
import localProvisioningQueueService from '../services/local-provisioning-queue.service';

const deriveLegacyStatus = (booking: any) => {
    if (booking.status === 'completed') return 'completed';
    if (booking.approvalStatus === 'rejected') return 'cancelled';
    if (booking.provisioningStatus === 'provisioned') return 'granted';
    if (booking.approvalStatus === 'approved') return 'confirmed';
    if (booking.provisioningStatus === 'pending') return 'requested';
    return 'pending';
};

const normalizeProvisioningPayload = (body: any) => {
    const localProvisioning = body.localProvisioning || {};
    const awsProvisioning = body.awsProvisioning || {};

    return {
        localProvisioning: {
            templateName: localProvisioning.templateName || '',
            vmId: localProvisioning.vmId || '',
            nodeName: localProvisioning.nodeName || '',
            username: localProvisioning.username || '',
            password: localProvisioning.password || '',
            ipAddress: localProvisioning.ipAddress || '',
            sshPort: localProvisioning.sshPort ? Number(localProvisioning.sshPort) : 22,
            cpuCores: localProvisioning.cpuCores ? Number(localProvisioning.cpuCores) : undefined,
            memoryMb: localProvisioning.memoryMb ? Number(localProvisioning.memoryMb) : undefined,
            diskGb: localProvisioning.diskGb ? Number(localProvisioning.diskGb) : undefined,
        },
        awsProvisioning: {
            launchUrl: awsProvisioning.launchUrl || body.provisionedUrl || '',
            accountLabel: awsProvisioning.accountLabel || '',
        },
    };
};

const studentOwnsBooking = (booking: any, userId?: string) => booking.user?.toString?.() === userId || booking.user?._id?.toString?.() === userId;

const calculateDeletionSchedule = async (expiresAt?: Date | null) => {
    if (!expiresAt) return undefined;
    const proxmoxConfig = await configService.get<any>('proxmox');
    const graceDays = Number(proxmoxConfig?.cleanupGraceDays || 0);
    return new Date(expiresAt.getTime() + graceDays * 24 * 60 * 60 * 1000);
};

export const createBooking = async (req: AuthRequest, res: Response) => {
    try {
        const { lab, startTime, endTime, purpose } = req.body;

        const labExists = await Lab.findById(lab);
        if (!labExists) {
            return res.status(404).json({ message: 'Lab not found' });
        }

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

        const activeBookingsAtTime = await Booking.countDocuments({
            lab,
            approvalStatus: 'approved',
            $or: [
                { startTime: { $lt: endTime, $gte: startTime } },
                { endTime: { $gt: startTime, $lte: endTime } },
                { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
            ],
        });

        let message = 'Booking request submitted. Please wait for technician approval.';
        if (activeBookingsAtTime >= labExists.capacity) {
            message = 'Lab is at capacity for this time slot. Your request is pending technician review.';
        }

        const booking = new Booking({
            user: req.user?.id,
            lab,
            startTime,
            endTime,
            purpose,
            status: 'pending',
            approvalStatus: 'pending',
            provisioningStatus: 'not_started',
            extensionStatus: 'none',
        });

        await booking.save();
        const populatedBooking = await Booking.findById(booking._id)
            .populate('lab', 'name type')
            .populate('user', 'name email');

        res.status(201).json({
            ...populatedBooking?.toObject(),
            message
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

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

export const cancelBooking = async (req: AuthRequest, res: Response) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('user lab');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (!studentOwnsBooking(booking, req.user?.id) && req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        booking.status = 'cancelled';
        booking.approvalStatus = 'rejected';
        await booking.save();

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

export const requestLabInstance = async (req: AuthRequest, res: Response) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (!studentOwnsBooking(booking, req.user?.id)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (booking.approvalStatus !== 'approved') {
            return res.status(400).json({ message: 'Booking must be approved before requesting provisioning' });
        }

        booking.provisioningStatus = 'pending';
        booking.status = 'requested';
        await booking.save();

        res.json({ message: 'Provisioning requested. Lab technician will provision your access soon.', status: 'requested' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const grantLabInstance = async (req: AuthRequest, res: Response) => {
    try {
        const { provisionedUrl, adminNote, provisioningType = 'aws', expiresAt } = req.body;
        const booking = await Booking.findById(req.params.id).populate('user lab');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.approvalStatus !== 'approved') {
            return res.status(400).json({ message: 'Booking must be approved before provisioning' });
        }

        const { localProvisioning, awsProvisioning } = normalizeProvisioningPayload(req.body);

        booking.provisioningType = provisioningType;
        booking.provisioningStatus = 'provisioned';
        booking.status = 'granted';
        booking.provisionedUrl = provisionedUrl;
        booking.provisionedAt = new Date();
        booking.expiresAt = expiresAt ? new Date(expiresAt) : booking.endTime;
        booking.deletionScheduledAt = await calculateDeletionSchedule(booking.expiresAt);
        booking.localProvisioning = localProvisioning as any;
        booking.awsProvisioning = awsProvisioning as any;
        if (adminNote) booking.adminNote = adminNote;

        if (provisioningType === 'local') {
            booking.provisioningStatus = 'pending';
            booking.status = 'requested';
            booking.adminNote = adminNote || 'Local VM queued for provisioning.';
        }

        await booking.save();

        if (provisioningType === 'local') {
            await localProvisioningQueueService.enqueue(booking._id.toString());
        }

        const user = booking.user as any;
        const lab = booking.lab as any;
        try {
            await emailService.sendEmail(user.email, 'booking_confirmed', {
                name: user.name,
                labName: lab.name,
                startTime: booking.startTime.toLocaleString(),
                endTime: booking.endTime.toLocaleString(),
                adminNote: provisioningType === 'local'
                    ? `Your local lab request has been queued for provisioning. ${adminNote || ''}`
                    : `Your AWS lab is ready! Access it at: ${provisionedUrl}. ${adminNote || ''}`
            });
        } catch (emailErr) {
            console.error('Failed to send grant email:', emailErr);
        }

        res.json({
            booking,
            message: provisioningType === 'local'
                ? 'Local VM queued for provisioning. Refresh the booking status shortly.'
                : 'AWS lab provisioned successfully.'
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const requestBookingExtension = async (req: AuthRequest, res: Response) => {
    try {
        const { requestedEndTime, reason } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (!studentOwnsBooking(booking, req.user?.id)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (booking.approvalStatus !== 'approved' || booking.provisioningStatus !== 'provisioned') {
            return res.status(400).json({ message: 'Only approved and provisioned bookings can request an extension' });
        }

        const requestedUntil = new Date(requestedEndTime);
        if (Number.isNaN(requestedUntil.getTime()) || requestedUntil <= booking.endTime) {
            return res.status(400).json({ message: 'Requested end time must be later than the current booking end time' });
        }

        booking.extensionStatus = 'requested';
        booking.extensionRequestedUntil = requestedUntil;
        booking.extensionReason = reason;
        await booking.save();

        res.json({
            message: 'Extension request submitted for technician review.',
            extensionStatus: booking.extensionStatus,
            extensionRequestedUntil: booking.extensionRequestedUntil,
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const updateBooking = async (req: AuthRequest, res: Response) => {
    try {
        const {
            status,
            endTime,
            adminNote,
            provisionedUrl,
            approvalStatus,
            provisioningType,
            provisioningStatus,
            expiresAt,
            deletionScheduledAt,
            extensionDecision,
            extensionReviewNote,
        } = req.body;

        const booking = await Booking.findById(req.params.id).populate('user lab');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const canApprove = req.user?.role === 'admin' || req.user?.permissions?.includes('manage_labs');
        const canProvision = req.user?.role === 'admin' || req.user?.permissions?.includes('provision_labs');

        if ((approvalStatus || status) && !canApprove) {
            return res.status(403).json({ message: 'Approval actions require booking management permission.' });
        }

        if ((provisioningType || provisioningStatus || provisionedUrl || req.body.localProvisioning || req.body.awsProvisioning || extensionDecision) && !canProvision) {
            return res.status(403).json({ message: 'Provisioning and extension review actions require provisioning permission.' });
        }

        const oldStatus = booking.status;
        const oldApprovalStatus = booking.approvalStatus;
        const oldProvisioningStatus = booking.provisioningStatus;
        const oldExpiresAt = booking.expiresAt;

        if (approvalStatus) {
            if (!['pending', 'approved', 'rejected'].includes(approvalStatus)) {
                return res.status(400).json({ message: 'Invalid approval status' });
            }
            booking.approvalStatus = approvalStatus as any;
            if (approvalStatus === 'rejected') {
                booking.provisioningStatus = 'not_started';
            }
        }

        if (status) {
            const validStatuses = ['confirmed', 'pending', 'cancelled', 'completed', 'requested', 'granted'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }
            booking.status = status;
            if (!approvalStatus) {
                if (status === 'confirmed') booking.approvalStatus = 'approved';
                if (status === 'cancelled') booking.approvalStatus = 'rejected';
            }
        }

        if (provisioningType) {
            if (!['aws', 'local'].includes(provisioningType)) {
                return res.status(400).json({ message: 'Invalid provisioning type' });
            }
            booking.provisioningType = provisioningType;
        }

        if (provisioningStatus) {
            if (!['not_started', 'pending', 'provisioned', 'failed', 'expired', 'deleted'].includes(provisioningStatus)) {
                return res.status(400).json({ message: 'Invalid provisioning status' });
            }
            booking.provisioningStatus = provisioningStatus as any;
        }

        const { localProvisioning, awsProvisioning } = normalizeProvisioningPayload(req.body);
        if (req.body.localProvisioning) {
            booking.localProvisioning = { ...(booking.localProvisioning as any || {}), ...localProvisioning } as any;
        }
        if (req.body.awsProvisioning) {
            booking.awsProvisioning = { ...(booking.awsProvisioning as any || {}), ...awsProvisioning } as any;
        }

        if (adminNote) {
            booking.adminNote = adminNote;
        }

        if (provisionedUrl) {
            booking.provisionedUrl = provisionedUrl;
            booking.provisionedAt = new Date();
            booking.awsProvisioning = { ...(booking.awsProvisioning as any || {}), launchUrl: provisionedUrl } as any;
        }

        if (expiresAt) {
            booking.expiresAt = new Date(expiresAt);
            booking.deletionScheduledAt = await calculateDeletionSchedule(booking.expiresAt);
        }

        if (deletionScheduledAt) {
            booking.deletionScheduledAt = new Date(deletionScheduledAt);
        }

        if (endTime) {
            const newEndTime = new Date(endTime);
            if (newEndTime <= booking.startTime) {
                return res.status(400).json({ message: 'End time must be after start time' });
            }
            booking.endTime = newEndTime;
            booking.adminNote = `Time extended until ${newEndTime.toLocaleTimeString()}`;
        }

        if (extensionDecision) {
            if (booking.extensionStatus !== 'requested' || !booking.extensionRequestedUntil) {
                return res.status(400).json({ message: 'No pending extension request found' });
            }

            if (extensionDecision === 'approved') {
                booking.endTime = booking.extensionRequestedUntil;
                booking.expiresAt = booking.extensionRequestedUntil;
                booking.deletionScheduledAt = await calculateDeletionSchedule(booking.expiresAt);
                booking.extensionStatus = 'approved';
                booking.adminNote = extensionReviewNote || `Extension approved until ${booking.extensionRequestedUntil.toLocaleString()}`;
            } else if (extensionDecision === 'rejected') {
                booking.extensionStatus = 'rejected';
                booking.adminNote = extensionReviewNote || 'Extension request rejected';
            } else {
                return res.status(400).json({ message: 'Invalid extension decision' });
            }
        }

        if (booking.provisioningType === 'local' && oldProvisioningStatus !== 'provisioned' && booking.provisioningStatus === 'provisioned') {
            const localConfig = booking.localProvisioning as any || {};
            booking.provisioningStatus = 'pending';
            booking.status = 'requested';
            booking.adminNote = booking.adminNote || 'Local VM queued for provisioning.';
            await booking.save();
            await localProvisioningQueueService.enqueue(booking._id.toString());

            const populatedQueuedBooking = await Booking.findById(booking._id)
                .populate('lab', 'name type')
                .populate('user', 'name email');

            return res.json({
                ...populatedQueuedBooking?.toObject(),
                message: 'Local VM queued for provisioning.'
            });
        }

        if (booking.provisioningType === 'local' && booking.expiresAt && oldExpiresAt?.getTime?.() !== booking.expiresAt.getTime()) {
            const localConfig = booking.localProvisioning as any || {};
            if (localConfig.vmId) {
                await proxmoxService.extendVmExpiry(localConfig.vmId, booking.expiresAt);
            }
        }

        booking.status = deriveLegacyStatus(booking);
        await booking.save();

        if ((status && status !== oldStatus) || (approvalStatus && approvalStatus !== oldApprovalStatus) || (provisioningStatus && provisioningStatus !== oldProvisioningStatus)) {
            const user = booking.user as any;
            const lab = booking.lab as any;
            let template = '';
            if (booking.approvalStatus === 'approved' && booking.provisioningStatus !== 'provisioned') template = 'booking_confirmed';
            else if (booking.approvalStatus === 'rejected') template = 'booking_cancelled';
            else if (booking.status === 'completed') template = 'booking_completed';

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
            if (booking.provisioningType === 'local' && (booking.localProvisioning as any)?.vmId) {
                try {
                    await proxmoxService.deleteVm((booking.localProvisioning as any).vmId, (booking.localProvisioning as any).nodeName);
                } catch (vmErr) {
                    console.error('Failed to delete Proxmox VM during booking purge:', vmErr);
                }
            }
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
            booking.approvalStatus = 'rejected';
            if (!booking.adminNote) booking.adminNote = `Archived: ${reason || 'Admin Action'}`;

            if (booking.provisioningType === 'local' && (booking.localProvisioning as any)?.vmId) {
                try {
                    await proxmoxService.stopVm((booking.localProvisioning as any).vmId, (booking.localProvisioning as any).nodeName);
                } catch (vmErr) {
                    console.error('Failed to stop Proxmox VM during booking archive:', vmErr);
                }
            }
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
