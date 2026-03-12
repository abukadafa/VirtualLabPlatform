import express from 'express';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    createUser,
    bulkCreateUsers,
    submitFeedback,
    getAllFeedback,
    deleteFeedback,
    bulkDeleteFeedback,
    getAllDeletedUsers,
    restoreUser,
    bulkDeleteUsers
    } from '../controllers/user.controller';
    import { authenticate, authorize, hasPermission } from '../middleware/auth.middleware';

    const router = express.Router();

    router.get('/feedback', authenticate, hasPermission('view_feedback'), getAllFeedback);
    router.post('/feedback', authenticate, submitFeedback);
    router.post('/feedback/bulk-delete', authenticate, hasPermission('view_feedback'), bulkDeleteFeedback);
    router.delete('/feedback/:id', authenticate, hasPermission('view_feedback'), deleteFeedback);
    router.get('/', authenticate, hasPermission('manage_users'), getAllUsers);

router.get('/deleted', authenticate, hasPermission('manage_users'), getAllDeletedUsers);
router.post('/bulk-delete', authenticate, hasPermission('manage_users'), bulkDeleteUsers);
router.post('/restore/:id', authenticate, hasPermission('manage_users'), restoreUser);
router.post('/', authenticate, hasPermission('manage_users'), createUser);
router.post('/bulk', authenticate, hasPermission('manage_users'), bulkCreateUsers);
router.get('/:id', authenticate, hasPermission('manage_users'), getUserById);
router.put('/:id', authenticate, hasPermission('manage_users'), updateUser);
router.delete('/:id', authenticate, hasPermission('manage_users'), deleteUser);

export default router;
