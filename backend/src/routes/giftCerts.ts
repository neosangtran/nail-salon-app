import { Router } from 'express';
import {
  getAllGiftCerts,
  getGiftCertByCode,
  getGiftCertById,
  createGiftCert,
  redeemGiftCert,
  deactivateGiftCert,
  getGiftCertStats,
} from '../controllers/giftCertController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /gift-certs/stats  — must be before /:id to avoid route conflict
router.get('/stats', getGiftCertStats);

// GET /gift-certs/code/:code
router.get('/code/:code', getGiftCertByCode);

// GET /gift-certs
router.get('/', getAllGiftCerts);

// GET /gift-certs/:id
router.get('/:id', getGiftCertById);

// POST /gift-certs/redeem  — any authenticated user (must precede POST /)
router.post('/redeem', redeemGiftCert);

// POST /gift-certs  — ADMIN or MANAGER only
router.post('/', requireRole('ADMIN', 'MANAGER'), createGiftCert);

// PUT /gift-certs/:id/deactivate  — ADMIN or MANAGER only
router.put('/:id/deactivate', requireRole('ADMIN', 'MANAGER'), deactivateGiftCert);

export default router;
