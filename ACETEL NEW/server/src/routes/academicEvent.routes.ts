import { Router, Request, Response } from 'express';
import AcademicEvent from '../models/AcademicEvent.model';

const router = Router();

// GET all academic events
router.get('/', async (req: Request, res: Response) => {
    try {
        const events = await AcademicEvent.find().sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching academic events', error });
    }
});

// POST - create a new academic event
router.post('/', async (req: Request, res: Response) => {
    try {
        const event = new AcademicEvent(req.body);
        await event.save();
        res.status(201).json(event);
    } catch (error) {
        res.status(400).json({ message: 'Error creating academic event', error });
    }
});

// PATCH - upload/append attendance records to an event
router.patch('/:id/attendance', async (req: Request, res: Response) => {
    try {
        const { attendees } = req.body;
        if (!Array.isArray(attendees)) {
            return res.status(400).json({ message: 'attendees must be an array' });
        }
        const event = await AcademicEvent.findByIdAndUpdate(
            req.params.id,
            { $push: { attendance: { $each: attendees } } },
            { new: true }
        );
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Error updating attendance', error });
    }
});

// DELETE - remove an academic event
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await AcademicEvent.findByIdAndDelete(req.params.id);
        res.json({ message: 'Academic event deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting academic event', error });
    }
});

export default router;
