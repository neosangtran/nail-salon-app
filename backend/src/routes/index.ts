import { Router, Request, Response } from 'express';
import authRouter from './auth';
import staffRouter from './staff';
import customerRouter from './customers';
import giftCertsRouter from './giftCerts';
import revenueRouter from './revenue';
import suppliesRouter from './supplies';
import bookingsRouter from './bookings';
import commissionsRouter from './commissions';
import servicesRouter from './services';

const router = Router();

// Root API info endpoint
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Nail Salon Management API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      appointments: '/api/appointments',
      clients: '/api/clients',
      services: '/api/services',
      staff: '/api/staff',
      customers: '/api/customers',
      inventory: '/api/inventory',
      reports: '/api/reports',
      giftCerts: '/api/gift-certs',
      revenue: '/api/revenue',
      supplies: '/api/supplies',
      commissions: '/api/commissions',
    },
  });
});

// Route registrations
router.use('/auth', authRouter);
router.use('/staff', staffRouter);
router.use('/customers', customerRouter);
router.use('/gift-certs', giftCertsRouter);
router.use('/revenue', revenueRouter);
router.use('/supplies', suppliesRouter);
router.use('/bookings', bookingsRouter);
router.use('/commissions', commissionsRouter);
router.use('/services', servicesRouter);

// Placeholder route registrations — to be wired in as modules are built
// router.use('/appointments', appointmentsRouter);
// router.use('/clients', clientsRouter);
// router.use('/inventory', inventoryRouter);
// router.use('/reports', reportsRouter);

export default router;
