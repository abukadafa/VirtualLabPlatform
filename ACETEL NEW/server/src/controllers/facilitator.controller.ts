import { Response } from 'express';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Assign lab to facilitator (Admin only)
 */
export const assignLabToFacilitator = async (req: AuthRequest, res: Response) => {
    try {
        const { facilitatorId, labId } = req.body;

        const facilitator = await User.findById(facilitatorId);
        if (!facilitator || facilitator.role !== 'facilitator') {
            return res.status(404).json({ message: 'Facilitator not found' });
        }

        // Add lab if not already enrolled
        if (!facilitator.enrolledLabs.includes(labId)) {
            facilitator.enrolledLabs.push(labId as any);
            await facilitator.save();
        }

        res.json({
            message: 'Lab assigned successfully',
            facilitator
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Remove lab from facilitator (Admin only)
 */
export const removeLabFromFacilitator = async (req: AuthRequest, res: Response) => {
    try {
        const { facilitatorId, labId } = req.body;

        const facilitator = await User.findById(facilitatorId);
        if (!facilitator) {
            return res.status(404).json({ message: 'Facilitator not found' });
        }

        facilitator.enrolledLabs = facilitator.enrolledLabs.filter(
            id => id.toString() !== labId
        );
        await facilitator.save();

        res.json({
            message: 'Lab removed successfully',
            facilitator
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get facilitator's enrolled labs
 */
export const getFacilitatorLabs = async (req: AuthRequest, res: Response) => {
    try {
        const { facilitatorId } = req.params;

        const facilitator = await User.findById(facilitatorId)
            .populate('enrolledLabs');

        if (!facilitator) {
            return res.status(404).json({ message: 'Facilitator not found' });
        }

        res.json(facilitator.enrolledLabs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
/**
 * Get all facilitators (Public/Authenticated)
 */
export const getAllFacilitators = async (req: any, res: Response) => {
    try {
        const facilitators = await User.find({ role: 'facilitator' })
            .select('name email programmes status studentId');
        res.json(facilitators);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
