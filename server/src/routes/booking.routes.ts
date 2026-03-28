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
    requestBookingExtension,
    getVncConsole,
} from '../controllers/booking.controller';
import { authenticate, hasPermission, hasAnyPermission } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/', authenticate, hasPermission('book_labs'), createBooking);
router.get('/my-bookings', authenticate, getMyBookings);
router.get('/', authenticate, hasAnyPermission('manage_labs', 'provision_labs'), getAllBookings);
router.get('/:id/vnc-console', authenticate, getVncConsole);
router.patch('/:id', authenticate, hasAnyPermission('manage_labs', 'provision_labs'), updateBooking);
router.patch('/:id/request-extension', authenticate, hasPermission('book_labs'), requestBookingExtension);
router.patch('/:id/request-instance', authenticate, hasPermission('request_lab_instance'), requestLabInstance);
router.patch('/:id/grant-instance', authenticate, hasPermission('provision_labs'), grantLabInstance);
router.patch('/:id/cancel', authenticate, hasAnyPermission('manage_labs', 'provision_labs'), cancelBooking);
router.delete('/:id', authenticate, hasAnyPermission('manage_labs', 'provision_labs'), deleteBooking);

export default router;
