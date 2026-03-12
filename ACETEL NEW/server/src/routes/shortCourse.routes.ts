import { Router, Request, Response } from 'express';
import Course from '../models/Course.model';

const router = Router();

// GET all short courses
router.get('/', async (req: Request, res: Response) => {
    try {
        const courses = await Course.find().sort({ name: 1 });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching short courses', error });
    }
});

// POST - create a new short course
router.post('/', async (req: Request, res: Response) => {
    try {
        const course = new Course(req.body);
        await course.save();
        res.status(201).json(course);
    } catch (error) {
        res.status(400).json({ message: 'Error creating short course', error });
    }
});

// PATCH - upload/append enrolled students to a course
router.patch('/:id/students', async (req: Request, res: Response) => {
    try {
        const { students } = req.body;
        if (!Array.isArray(students)) {
            return res.status(400).json({ message: 'students must be an array' });
        }
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            {
                $push: { students: { $each: students } },
                $inc: { studentsCount: students.length },
            },
            { new: true }
        );
        if (!course) return res.status(404).json({ message: 'Course not found' });
        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Error updating enrolled students', error });
    }
});

export default router;
