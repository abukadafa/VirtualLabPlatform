import { Request, Response } from 'express';
import Assignment from '../models/Assignment.model';

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
        const assignments = await Assignment.find().populate('course lab');
        res.json(assignments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
