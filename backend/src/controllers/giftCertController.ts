import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate unique gift certificate code: GC-YYYY-XXXXXX
function generateCode(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GC-${year}-${suffix}`;
}

async function generateUniqueCode(): Promise<string> {
  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.giftCertificate.findUnique({ where: { code } });
    if (!existing) return code;
    code = generateCode();
    attempts++;
  }
  throw new Error('Failed to generate a unique gift certificate code');
}

// GET /gift-certs
export const getAllGiftCerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      isActive,
      search,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { purchaserName: { contains: search } },
        { recipientName: { contains: search } },
      ];
    }

    const [certs, total] = await Promise.all([
      prisma.giftCertificate.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { purchasedAt: 'desc' },
      }),
      prisma.giftCertificate.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        giftCertificates: certs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('[getAllGiftCerts]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch gift certificates' });
  }
};

// GET /gift-certs/code/:code
export const getGiftCertByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;

    const cert = await prisma.giftCertificate.findUnique({ where: { code } });

    if (!cert) {
      res.status(404).json({ success: false, error: 'Gift certificate not found' });
      return;
    }

    res.status(200).json({ success: true, data: cert });
  } catch (error) {
    console.error('[getGiftCertByCode]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch gift certificate' });
  }
};

// GET /gift-certs/:id
export const getGiftCertById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const cert = await prisma.giftCertificate.findUnique({ where: { id } });

    if (!cert) {
      res.status(404).json({ success: false, error: 'Gift certificate not found' });
      return;
    }

    res.status(200).json({ success: true, data: cert });
  } catch (error) {
    console.error('[getGiftCertById]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch gift certificate' });
  }
};

// POST /gift-certs
export const createGiftCert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { originalAmount, purchaserName, purchaserEmail, recipientName, expiresAt, notes } =
      req.body;

    if (originalAmount === undefined || originalAmount === null) {
      res.status(400).json({ success: false, error: 'originalAmount is required' });
      return;
    }

    const amount = parseFloat(originalAmount);
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ success: false, error: 'originalAmount must be a positive number' });
      return;
    }

    if (!expiresAt) {
      res.status(400).json({ success: false, error: 'expiresAt is required' });
      return;
    }

    const expiresAtDate = new Date(expiresAt);
    if (isNaN(expiresAtDate.getTime())) {
      res.status(400).json({ success: false, error: 'expiresAt must be a valid date' });
      return;
    }

    const code = await generateUniqueCode();

    const cert = await prisma.giftCertificate.create({
      data: {
        code,
        originalAmount: amount,
        remainingBalance: amount,
        purchaserName: purchaserName ?? null,
        purchaserEmail: purchaserEmail ?? null,
        recipientName: recipientName ?? null,
        expiresAt: expiresAtDate,
        notes: notes ?? null,
        isActive: true,
      },
    });

    res.status(201).json({ success: true, data: cert });
  } catch (error) {
    console.error('[createGiftCert]', error);
    res.status(500).json({ success: false, error: 'Failed to create gift certificate' });
  }
};

// POST /gift-certs/redeem
export const redeemGiftCert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, amount } = req.body;

    if (!code) {
      res.status(400).json({ success: false, error: 'code is required' });
      return;
    }

    if (amount === undefined || amount === null) {
      res.status(400).json({ success: false, error: 'amount is required' });
      return;
    }

    const redeemAmount = parseFloat(amount);
    if (isNaN(redeemAmount) || redeemAmount <= 0) {
      res.status(400).json({ success: false, error: 'amount must be a positive number' });
      return;
    }

    const cert = await prisma.giftCertificate.findUnique({ where: { code } });

    if (!cert) {
      res.status(404).json({ success: false, error: 'Gift certificate not found' });
      return;
    }

    if (!cert.isActive) {
      res.status(400).json({ success: false, error: 'Gift certificate is not active' });
      return;
    }

    const now = new Date();
    if (cert.expiresAt < now) {
      res.status(400).json({ success: false, error: 'Gift certificate has expired' });
      return;
    }

    if (cert.remainingBalance < redeemAmount) {
      res.status(400).json({
        success: false,
        error: `Insufficient balance. Remaining: ${cert.remainingBalance}`,
      });
      return;
    }

    const newBalance = parseFloat((cert.remainingBalance - redeemAmount).toFixed(2));
    const isNowEmpty = newBalance === 0;

    const updated = await prisma.giftCertificate.update({
      where: { code },
      data: {
        remainingBalance: newBalance,
        isActive: isNowEmpty ? false : true,
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('[redeemGiftCert]', error);
    res.status(500).json({ success: false, error: 'Failed to redeem gift certificate' });
  }
};

// PUT /gift-certs/:id/deactivate
export const deactivateGiftCert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.giftCertificate.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Gift certificate not found' });
      return;
    }

    const cert = await prisma.giftCertificate.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json({ success: true, data: cert });
  } catch (error) {
    console.error('[deactivateGiftCert]', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate gift certificate' });
  }
};

// GET /gift-certs/stats
export const getGiftCertStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();

    const [all, active, expired] = await Promise.all([
      prisma.giftCertificate.findMany({
        select: { originalAmount: true, remainingBalance: true },
      }),
      prisma.giftCertificate.count({ where: { isActive: true } }),
      prisma.giftCertificate.count({ where: { expiresAt: { lt: now } } }),
    ]);

    const totalIssued = all.length;
    const totalValue = all.reduce((sum, c) => sum + c.originalAmount, 0);
    const totalRedeemedValue = all.reduce(
      (sum, c) => sum + (c.originalAmount - c.remainingBalance),
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        totalIssued,
        totalValue: parseFloat(totalValue.toFixed(2)),
        totalRedeemedValue: parseFloat(totalRedeemedValue.toFixed(2)),
        activeCertsCount: active,
        expiredCertsCount: expired,
      },
    });
  } catch (error) {
    console.error('[getGiftCertStats]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch gift certificate stats' });
  }
};
