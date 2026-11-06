import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticate);

// GET /services — active services, for booking forms
router.get('/', async (_req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true, duration: true, price: true, category: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.status(200).json({ success: true, data: { services } });
  } catch (err) {
    console.error('[getServices]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch services' });
  }
});

export default router;
