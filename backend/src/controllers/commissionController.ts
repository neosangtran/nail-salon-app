import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: derive YYYY-MM period string from a Date
function toPeriod(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Helper: parse period to start/end Date range (inclusive of full month)
function periodToRange(period: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(period)) return null;
  const [year, month] = period.split('-').map(Number);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999); // last day of month
  return { start, end };
}

// GET /commissions
// Query: staffId, period (YYYY-MM), isPaid (bool), page, limit
export const getAllCommissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      staffId,
      period,
      isPaid,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (staffId) where.staffId = staffId;
    if (period) where.period = period;
    if (isPaid !== undefined) where.isPaid = isPaid === 'true';

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
        include: {
          staff: {
            select: { id: true, name: true, commissionRate: true },
          },
          appointment: {
            select: {
              id: true,
              date: true,
              totalPrice: true,
              status: true,
              service: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.commission.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        commissions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('[getAllCommissions]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch commissions' });
  }
};

// GET /commissions/:id
export const getCommissionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const commission = await prisma.commission.findUnique({
      where: { id },
      include: {
        staff: { select: { id: true, name: true, commissionRate: true } },
        appointment: {
          select: {
            id: true,
            date: true,
            totalPrice: true,
            status: true,
            service: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!commission) {
      res.status(404).json({ success: false, error: 'Commission record not found' });
      return;
    }

    res.status(200).json({ success: true, data: commission });
  } catch (error) {
    console.error('[getCommissionById]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch commission' });
  }
};

// GET /commissions/staff/:staffId
// Returns commissions grouped by period: [{period, totalEarned, totalPaid, totalUnpaid, commissions[]}]
export const getCommissionsByStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { staffId } = req.params;

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, name: true, commissionRate: true },
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'Staff member not found' });
      return;
    }

    const commissions = await prisma.commission.findMany({
      where: { staffId },
      orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      include: {
        appointment: {
          select: {
            id: true,
            date: true,
            totalPrice: true,
            status: true,
            service: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Group by period
    const periodMap = new Map<
      string,
      { period: string; totalEarned: number; totalPaid: number; totalUnpaid: number; commissions: typeof commissions }
    >();

    for (const c of commissions) {
      if (!periodMap.has(c.period)) {
        periodMap.set(c.period, {
          period: c.period,
          totalEarned: 0,
          totalPaid: 0,
          totalUnpaid: 0,
          commissions: [],
        });
      }
      const group = periodMap.get(c.period)!;
      group.totalEarned += c.amount;
      if (c.isPaid) {
        group.totalPaid += c.amount;
      } else {
        group.totalUnpaid += c.amount;
      }
      group.commissions.push(c);
    }

    const grouped = Array.from(periodMap.values()).sort((a, b) =>
      b.period.localeCompare(a.period)
    );

    res.status(200).json({
      success: true,
      data: {
        staff,
        periods: grouped,
      },
    });
  } catch (error) {
    console.error('[getCommissionsByStaff]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff commissions' });
  }
};

// POST /commissions/calculate
// Body: { staffId?, period? }
// Recalculates commissions for COMPLETED appointments that don't yet have a commission record.
export const calculateCommissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { staffId, period } = req.body as { staffId?: string; period?: string };

    // Build appointment filter
    const appointmentWhere: Record<string, unknown> = { status: 'COMPLETED' };

    if (staffId) {
      const staff = await prisma.staff.findUnique({ where: { id: staffId } });
      if (!staff) {
        res.status(404).json({ success: false, error: 'Staff member not found' });
        return;
      }
      appointmentWhere.staffId = staffId;
    }

    if (period) {
      const range = periodToRange(period);
      if (!range) {
        res.status(400).json({ success: false, error: 'period must be in YYYY-MM format' });
        return;
      }
      appointmentWhere.date = { gte: range.start, lte: range.end };
    }

    // Find eligible appointments that do not yet have a commission record
    const appointments = await prisma.appointment.findMany({
      where: {
        ...appointmentWhere,
        commissions: { none: {} },
      },
      include: {
        staff: { select: { id: true, name: true, commissionRate: true } },
        service: { select: { id: true, name: true } },
      },
    });

    if (appointments.length === 0) {
      res.status(200).json({
        success: true,
        data: { created: 0, commissions: [] },
        message: 'No new commissions to calculate',
      });
      return;
    }

    // Create commission records in a transaction
    const created = await prisma.$transaction(
      appointments.map((appt) => {
        const rate = appt.staff.commissionRate;
        const amount = parseFloat((appt.totalPrice * rate).toFixed(2));
        const commPeriod = toPeriod(appt.date);

        return prisma.commission.create({
          data: {
            staffId: appt.staffId,
            appointmentId: appt.id,
            amount,
            rate,
            period: commPeriod,
          },
          include: {
            staff: { select: { id: true, name: true, commissionRate: true } },
            appointment: {
              select: {
                id: true,
                date: true,
                totalPrice: true,
                status: true,
                service: { select: { id: true, name: true } },
              },
            },
          },
        });
      })
    );

    res.status(201).json({
      success: true,
      data: { created: created.length, commissions: created },
    });
  } catch (error) {
    console.error('[calculateCommissions]', error);
    res.status(500).json({ success: false, error: 'Failed to calculate commissions' });
  }
};

// PUT /commissions/:id/pay
// Marks a single commission as paid
export const markAsPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.commission.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Commission record not found' });
      return;
    }

    if (existing.isPaid) {
      res.status(400).json({ success: false, error: 'Commission is already marked as paid' });
      return;
    }

    const commission = await prisma.commission.update({
      where: { id },
      data: { isPaid: true, paidAt: new Date() },
      include: {
        staff: { select: { id: true, name: true, commissionRate: true } },
        appointment: {
          select: {
            id: true,
            date: true,
            totalPrice: true,
            status: true,
            service: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.status(200).json({ success: true, data: commission });
  } catch (error) {
    console.error('[markAsPaid]', error);
    res.status(500).json({ success: false, error: 'Failed to mark commission as paid' });
  }
};

// PUT /commissions/bulk-pay
// Body: { commissionIds: string[] }
export const markBulkAsPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    const { commissionIds } = req.body as { commissionIds?: string[] };

    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      res.status(400).json({ success: false, error: 'commissionIds must be a non-empty array' });
      return;
    }

    const paidAt = new Date();

    const result = await prisma.commission.updateMany({
      where: {
        id: { in: commissionIds },
        isPaid: false,
      },
      data: { isPaid: true, paidAt },
    });

    // Return the updated records
    const updated = await prisma.commission.findMany({
      where: { id: { in: commissionIds } },
      include: {
        staff: { select: { id: true, name: true, commissionRate: true } },
        appointment: {
          select: {
            id: true,
            date: true,
            totalPrice: true,
            status: true,
            service: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        updatedCount: result.count,
        commissions: updated,
      },
    });
  } catch (error) {
    console.error('[markBulkAsPaid]', error);
    res.status(500).json({ success: false, error: 'Failed to bulk-mark commissions as paid' });
  }
};

// GET /commissions/summary?period=
// Returns [{staffId, staffName, period, totalEarned, totalPaid, totalUnpaid}]
export const getSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (period) {
      if (!/^\d{4}-\d{2}$/.test(period)) {
        res.status(400).json({ success: false, error: 'period must be in YYYY-MM format' });
        return;
      }
      where.period = period;
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true } },
      },
      orderBy: [{ period: 'desc' }, { staffId: 'asc' }],
    });

    // Group by staffId + period
    const groupMap = new Map<
      string,
      { staffId: string; staffName: string; period: string; totalEarned: number; totalPaid: number; totalUnpaid: number }
    >();

    for (const c of commissions) {
      const key = `${c.staffId}::${c.period}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          staffId: c.staffId,
          staffName: c.staff.name,
          period: c.period,
          totalEarned: 0,
          totalPaid: 0,
          totalUnpaid: 0,
        });
      }
      const group = groupMap.get(key)!;
      group.totalEarned += c.amount;
      if (c.isPaid) {
        group.totalPaid += c.amount;
      } else {
        group.totalUnpaid += c.amount;
      }
    }

    const summary = Array.from(groupMap.values()).sort((a, b) => {
      if (b.period !== a.period) return b.period.localeCompare(a.period);
      return a.staffName.localeCompare(b.staffName);
    });

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    console.error('[getSummary]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch commission summary' });
  }
};
