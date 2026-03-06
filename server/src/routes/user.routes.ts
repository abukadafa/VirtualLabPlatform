import express from 'express';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    createUser,
    bulkCreateUsers,
    submitFeedback,
    getAllFeedback
} from '../controllers/user.controller';
import { authenticate, authorize, hasPermission } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/feedback', authenticate, hasPermission('view_feedback'), getAllFeedback);
router.post('/feedback', authenticate, submitFeedback);
router.get('/', authenticate, hasPermission('manage_users'), getAllUsers);
router.post('/', authenticate, hasPermission('manage_users'), createUser);
router.post('/bulk', authenticate, hasPermission('manage_users'), bulkCreateUsers);
router.get('/:id', authenticate, hasPermission('manage_users'), getUserById);
router.put('/:id', authenticate, hasPermission('manage_users'), updateUser);
router.delete('/:id', authenticate, hasPermission('manage_users'), deleteUser);

export default router;
