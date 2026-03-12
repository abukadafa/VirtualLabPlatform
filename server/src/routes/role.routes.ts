import express from 'express';
import {
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    getPermissions,
    seedRoles
} from '../controllers/role.controller';
import { authenticate, authorize, hasPermission } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/', authenticate, getRoles);
router.get('/permissions', authenticate, getPermissions);
router.post('/seed', authenticate, hasPermission('manage_roles'), seedRoles);
router.post('/', authenticate, hasPermission('manage_roles'), createRole);
router.put('/:id', authenticate, hasPermission('manage_roles'), updateRole);
router.delete('/:id', authenticate, hasPermission('manage_roles'), deleteRole);

export default router;
