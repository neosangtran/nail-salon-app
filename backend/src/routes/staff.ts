import { Router } from 'express';
import {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffSchedule,
} from '../controllers/staffController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// GET /staff — list all staff (authenticated)
router.get('/', authenticate, getAllStaff);

// GET /staff/:id — get single staff member (authenticated)
router.get('/:id', authenticate, getStaffById);

// POST /staff — create staff (ADMIN or MANAGER only)
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), createStaff);

// PUT /staff/:id — update staff (ADMIN or MANAGER only)
router.put('/:id', authenticate, requireRole('ADMIN', 'MANAGER'), updateStaff);

// DELETE /staff/:id — soft delete (ADMIN only)
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteStaff);

// GET /staff/:id/schedule — get staff schedule (authenticated)
router.get('/:id/schedule', authenticate, getStaffSchedule);

export default router;
