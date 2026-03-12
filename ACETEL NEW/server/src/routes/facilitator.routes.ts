import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
    assignLabToFacilitator,
    removeLabFromFacilitator,
    getFacilitatorLabs,
    getAllFacilitators
} from '../controllers/facilitator.controller';

const router = express.Router();

/**
 * @route   POST /api/facilitators/assign-lab
 * @desc    Assign a lab to a facilitator
 * @access  Admin
 */
router.post('/assign-lab',
    authenticate,
    authorize('admin'),
    assignLabToFacilitator
);

/**
 * @route   POST /api/facilitators/remove-lab
 * @desc    Remove a lab from a facilitator
 * @access  Admin
 */
router.post('/remove-lab',
    authenticate,
    authorize('admin'),
    removeLabFromFacilitator
);

/**
 * @route   GET /api/facilitators/:facilitatorId/labs
 * @desc    Get all labs assigned to a facilitator
 * @access  Authenticated (Admin/Facilitator themself)
 */
router.get('/:facilitatorId/labs',
    authenticate,
    getFacilitatorLabs
);

/**
 * @route   GET /api/facilitators/all
 * @desc    Get all facilitators
 * @access  Public
 */
router.get('/all', getAllFacilitators);

export default router;
