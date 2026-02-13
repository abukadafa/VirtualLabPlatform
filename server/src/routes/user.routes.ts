import express from 'express';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    createUser,
    bulkCreateUsers,
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/', authenticate, authorize('admin'), getAllUsers);
router.post('/', authenticate, authorize('admin'), createUser);
router.post('/bulk', authenticate, authorize('admin'), bulkCreateUsers);
router.get('/:id', authenticate, authorize('admin', 'facilitator'), getUserById);
router.put('/:id', authenticate, authorize('admin'), updateUser);
router.delete('/:id', authenticate, authorize('admin'), deleteUser);

export default router;
