import { Router } from 'express';
import {
  getAllSupplies,
  getSupplyById,
  createSupply,
  updateSupply,
  deleteSupply,
  restockSupply,
  getLowStockAlerts,
} from '../controllers/suppliesController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /supplies/low-stock — must be registered before /:id to avoid route conflict
router.get('/low-stock', getLowStockAlerts);

// GET /supplies
router.get('/', getAllSupplies);

// GET /supplies/:id
router.get('/:id', getSupplyById);

// POST /supplies — ADMIN or MANAGER only
router.post('/', requireRole('ADMIN', 'MANAGER'), createSupply);

// PUT /supplies/:id — ADMIN or MANAGER only
router.put('/:id', requireRole('ADMIN', 'MANAGER'), updateSupply);

// DELETE /supplies/:id — ADMIN only
router.delete('/:id', requireRole('ADMIN'), deleteSupply);

// POST /supplies/:id/restock — ADMIN or MANAGER only
router.post('/:id/restock', requireRole('ADMIN', 'MANAGER'), restockSupply);

export default router;
