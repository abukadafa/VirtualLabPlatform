import express from 'express';
import {
    createBooking,
    getMyBookings,
    getAllBookings,
    cancelBooking,
    updateBooking,
} from '../controllers/booking.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/', authenticate, createBooking);
router.get('/my-bookings', authenticate, getMyBookings);
router.get('/', authenticate, authorize('admin', 'facilitator'), getAllBookings);
router.patch('/:id', authenticate, authorize('admin', 'facilitator'), updateBooking);
router.patch('/:id/cancel', authenticate, authorize('admin'), cancelBooking);

export default router;
