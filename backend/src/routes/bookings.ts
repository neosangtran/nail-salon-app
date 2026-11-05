import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  completeBooking,
  checkAvailability,
} from '../controllers/bookingController';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

// GET /bookings/availability?staffId=&date=&serviceId=
// Must be defined before /:id to avoid "availability" being treated as an id
router.get('/availability', checkAvailability);

// GET /bookings?date=&staffId=&customerId=&status=&startDate=&endDate=&page=&limit=
router.get('/', getAllBookings);

// GET /bookings/:id
router.get('/:id', getBookingById);

// POST /bookings
router.post('/', createBooking);

// PUT /bookings/:id
router.put('/:id', updateBooking);

// PUT /bookings/:id/cancel
router.put('/:id/cancel', cancelBooking);

// PUT /bookings/:id/complete — ADMIN or MANAGER only
router.put('/:id/complete', requireRole('ADMIN', 'MANAGER'), completeBooking);

export default router;
