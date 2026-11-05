import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerVisits,
  addLoyaltyPoints,
} from '../controllers/customerController';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/:id/visits', getCustomerVisits);
router.post('/:id/loyalty', addLoyaltyPoints);

export default router;
