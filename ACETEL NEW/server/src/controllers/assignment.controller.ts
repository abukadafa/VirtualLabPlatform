import { Request, Response } from 'express';
import Assignment from '../models/Assignment.model';
import User from '../models/User.model';

export const getAssignmentsByLab = async (req: Request, res: Response) => {
    try {
        const { labId } = req.params;
        const assignments = await Assignment.find({ lab: labId }).populate('course');
        res.json(assignments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createAssignment = async (req: Request, res: Response) => {
    try {
        const assignment = new Assignment(req.body);
        await assignment.save();
        res.status(201).json(assignment);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
export const getAllAssignments = async (req: Request, res: Response) => {
    try {
        const { user } = req as any; // properties added by auth middleware
        let filter: any = {};

        if (user.role === 'facilitator') {
            // Re-fetch user to get up-to-date enrolledLabs if not present in token
            // note: auth middleware typically puts basic info in token. 
            // We might need to fetch the full user model if enrolledLabs isn't in the token payload.
            // Based on auth.controller, token has { id, role, programmes }. 
            // So we MUST fetch the user.
            // Avoid circular dependency if possible, but we need User model. (Already imported? No, need to import)
            // const User = require('../models/User.model').default; 
            const fullUser = await User.findById(user.id);

            if (fullUser && fullUser.enrolledLabs && fullUser.enrolledLabs.length > 0) {
                filter = { lab: { $in: fullUser.enrolledLabs } };
            } else {
                return res.json([]); // No labs assigned
            }
        }

        const assignments = await Assignment.find(filter).populate('course lab');
        res.json(assignments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
