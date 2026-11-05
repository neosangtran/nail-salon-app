import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getSummary,
  getDailyRevenue,
  getByDateRange,
  recordRevenue,
  getTopServices,
  getTopStaff,
} from '../controllers/revenueController';

const router = Router();

// All revenue routes require authentication
router.use(authenticate);

// GET /revenue/summary?period=today|week|month|year|custom&startDate=&endDate=
router.get('/summary', getSummary);

// GET /revenue/daily?startDate=&endDate=
router.get('/daily', getDailyRevenue);

// GET /revenue/transactions?startDate=&endDate=&type=&paymentMethod=&page=&limit=
router.get('/transactions', getByDateRange);

// GET /revenue/top-services?startDate=&endDate=
router.get('/top-services', getTopServices);

// GET /revenue/top-staff?startDate=&endDate=
router.get('/top-staff', getTopStaff);

// POST /revenue
router.post('/', recordRevenue);

export default router;
