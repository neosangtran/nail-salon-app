import { Router } from 'express';
import {
  getAllCommissions,
  getCommissionById,
  getCommissionsByStaff,
  calculateCommissions,
  markAsPaid,
  markBulkAsPaid,
  getSummary,
} from '../controllers/commissionController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// GET /commissions — list all commissions (authenticated)
router.get('/', authenticate, getAllCommissions);

// GET /commissions/summary?period= — summary per staff per period (authenticated)
router.get('/summary', authenticate, getSummary);

// GET /commissions/staff/:staffId — commissions for a staff member grouped by period (authenticated)
router.get('/staff/:staffId', authenticate, getCommissionsByStaff);

// POST /commissions/calculate — recalculate/create missing commissions (ADMIN | MANAGER)
router.post('/calculate', authenticate, requireRole('ADMIN', 'MANAGER'), calculateCommissions);

// PUT /commissions/bulk-pay — mark multiple commissions as paid (ADMIN | MANAGER)
router.put('/bulk-pay', authenticate, requireRole('ADMIN', 'MANAGER'), markBulkAsPaid);

// GET /commissions/:id — get single commission (authenticated)
router.get('/:id', authenticate, getCommissionById);

// PUT /commissions/:id/pay — mark single commission as paid (ADMIN | MANAGER)
router.put('/:id/pay', authenticate, requireRole('ADMIN', 'MANAGER'), markAsPaid);

export default router;
