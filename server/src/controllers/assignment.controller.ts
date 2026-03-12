import { Response } from 'express';
import Assignment from '../models/Assignment.model';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAssignmentsByLab = async (req: AuthRequest, res: Response) => {
    try {
        const { labId } = req.params;
        const assignments = await Assignment.find({ lab: labId }).populate('course');
        res.json(assignments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createAssignment = async (req: AuthRequest, res: Response) => {
    try {
        const assignment = new Assignment(req.body);
        await assignment.save();
        res.status(201).json(assignment);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllAssignments = async (req: AuthRequest, res: Response) => {
    try {
        let query: any = {};

        // If user is not admin, filter by their programme
        if (req.user && req.user.role !== 'admin') {
            const userProgrammes = req.user.programmes || [];
            
            // Map full programme names to lab types
            const typeMapping: { [key: string]: string } = {
                'Artificial Intelligence': 'AI',
                'Cybersecurity': 'Cybersecurity',
                'Management Information System': 'MIS'
            };

            const allowedTypes = userProgrammes.map(p => typeMapping[p]).filter(Boolean);
            
            // We need to filter assignments where the lab's type is in allowedTypes
            // We can do this by first finding the relevant labs or using a populate filter
            const Lab = (await import('../models/Lab.model')).default;
            const labs = await Lab.find({ type: { $in: allowedTypes } });
            const labIds = labs.map(l => l._id);
            
            query.lab = { $in: labIds };
        }

        const assignments = await Assignment.find(query).populate('course lab');
        res.json(assignments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
