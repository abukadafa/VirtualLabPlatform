import express from 'express';
import {
    createBooking,
    getMyBookings,
    getAllBookings,
    cancelBooking,
    updateBooking,
    requestLabInstance,
    grantLabInstance,
    deleteBooking,
} from '../controllers/booking.controller';
import { authenticate, authorize, hasPermission } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/', authenticate, hasPermission('book_labs'), createBooking);
router.get('/my-bookings', authenticate, getMyBookings);
router.get('/', authenticate, hasPermission('manage_labs'), getAllBookings);
router.patch('/:id', authenticate, hasPermission('manage_labs'), updateBooking);
router.patch('/:id/request-instance', authenticate, hasPermission('request_lab_instance'), requestLabInstance);
router.patch('/:id/grant-instance', authenticate, hasPermission('provision_labs'), grantLabInstance);
router.patch('/:id/cancel', authenticate, hasPermission('manage_labs'), cancelBooking);
router.delete('/:id', authenticate, hasPermission('manage_labs'), deleteBooking);

export default router;
