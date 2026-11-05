import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  eachDayOfInterval,
  format,
  isValid,
} from 'date-fns';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPeriodDates(
  period: string,
  startDate?: string,
  endDate?: string,
): { start: Date; end: Date } {
  const now = new Date();

  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'custom': {
      if (!startDate || !endDate) {
        throw new Error('startDate and endDate are required for custom period');
      }
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      if (!isValid(start) || !isValid(end)) {
        throw new Error('Invalid startDate or endDate format. Use ISO 8601 (YYYY-MM-DD).');
      }
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

function parsePaginationParams(query: Record<string, unknown>): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

// ---------------------------------------------------------------------------
// getSummary — GET /revenue/summary
// ---------------------------------------------------------------------------

export async function getSummary(req: Request, res: Response): Promise<void> {
  try {
    const { period = 'today', startDate, endDate } = req.query as Record<string, string>;

    let start: Date;
    let end: Date;
    try {
      ({ start, end } = getPeriodDates(period, startDate, endDate));
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
      return;
    }

    const revenues = await prisma.revenue.findMany({
      where: { date: { gte: start, lte: end } },
    });

    const appointmentCount = await prisma.appointment.count({
      where: {
        date: { gte: start, lte: end },
        status: 'COMPLETED',
      },
    });

    // Aggregate by type
    const byType: Record<string, number> = {
      SERVICE: 0,
      GIFT_CERT_PURCHASE: 0,
      TIP: 0,
      OTHER: 0,
    };

    // Aggregate by payment method
    const byPaymentMethod: Record<string, number> = {
      CASH: 0,
      CARD: 0,
      GIFT_CERTIFICATE: 0,
      MIXED: 0,
    };

    let totalRevenue = 0;
    let totalServices = 0;
    let totalTips = 0;
    let totalGiftCerts = 0;

    for (const r of revenues) {
      totalRevenue += r.amount;

      byType[r.type] = (byType[r.type] ?? 0) + r.amount;
      byPaymentMethod[r.paymentMethod] = (byPaymentMethod[r.paymentMethod] ?? 0) + r.amount;

      if (r.type === 'SERVICE') totalServices += r.amount;
      if (r.type === 'TIP') totalTips += r.amount;
      if (r.type === 'GIFT_CERT_PURCHASE') totalGiftCerts += r.amount;
    }

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalRevenue,
        totalServices,
        totalTips,
        totalGiftCerts,
        byPaymentMethod: {
          CASH: byPaymentMethod.CASH,
          CARD: byPaymentMethod.CARD,
          GIFT_CERTIFICATE: byPaymentMethod.GIFT_CERTIFICATE,
          MIXED: byPaymentMethod.MIXED,
        },
        byType,
        appointmentCount,
      },
    });
  } catch (err) {
    console.error('[getSummary]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch revenue summary' });
  }
}

// ---------------------------------------------------------------------------
// getDailyRevenue — GET /revenue/daily
// ---------------------------------------------------------------------------

export async function getDailyRevenue(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;

    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: 'startDate and endDate are required' });
      return;
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (!isValid(start) || !isValid(end)) {
      res.status(400).json({ success: false, error: 'Invalid date format. Use ISO 8601 (YYYY-MM-DD).' });
      return;
    }

    const revenues = await prisma.revenue.findMany({
      where: { date: { gte: startOfDay(start), lte: endOfDay(end) } },
    });

    // Build a map keyed by YYYY-MM-DD
    const dayMap: Record<string, { total: number; serviceRevenue: number; tips: number }> = {};

    for (const r of revenues) {
      const key = format(r.date, 'yyyy-MM-dd');
      if (!dayMap[key]) {
        dayMap[key] = { total: 0, serviceRevenue: 0, tips: 0 };
      }
      dayMap[key].total += r.amount;
      if (r.type === 'SERVICE') dayMap[key].serviceRevenue += r.amount;
      if (r.type === 'TIP') dayMap[key].tips += r.amount;
    }

    // Produce one entry per calendar day in the range (even if zero)
    const days = eachDayOfInterval({ start, end });
    const data = days.map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      return {
        date: key,
        total: dayMap[key]?.total ?? 0,
        serviceRevenue: dayMap[key]?.serviceRevenue ?? 0,
        tips: dayMap[key]?.tips ?? 0,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getDailyRevenue]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch daily revenue' });
  }
}

// ---------------------------------------------------------------------------
// getByDateRange — GET /revenue/transactions  (paginated)
// ---------------------------------------------------------------------------

export async function getByDateRange(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate, type, paymentMethod } = req.query as Record<string, string>;
    const { page, limit, skip } = parsePaginationParams(req.query);

    const where: Record<string, unknown> = {};

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        const s = parseISO(startDate);
        if (!isValid(s)) {
          res.status(400).json({ success: false, error: 'Invalid startDate' });
          return;
        }
        dateFilter.gte = startOfDay(s);
      }
      if (endDate) {
        const e = parseISO(endDate);
        if (!isValid(e)) {
          res.status(400).json({ success: false, error: 'Invalid endDate' });
          return;
        }
        dateFilter.lte = endOfDay(e);
      }
      where.date = dateFilter;
    }

    if (type) where.type = type;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const [transactions, total] = await Promise.all([
      prisma.revenue.findMany({
        where,
        include: {
          appointment: {
            include: {
              customer: { select: { name: true } },
              staff: { select: { name: true } },
              service: { select: { name: true, category: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.revenue.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (err) {
    console.error('[getByDateRange]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
}

// ---------------------------------------------------------------------------
// recordRevenue — POST /revenue
// ---------------------------------------------------------------------------

export async function recordRevenue(req: Request, res: Response): Promise<void> {
  try {
    const { amount, type, paymentMethod, appointmentId, notes, date } = req.body as {
      amount?: unknown;
      type?: string;
      paymentMethod?: string;
      appointmentId?: string;
      notes?: string;
      date?: string;
    };

    // Validation
    if (amount === undefined || amount === null) {
      res.status(400).json({ success: false, error: 'amount is required' });
      return;
    }
    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ success: false, error: 'amount must be a positive number' });
      return;
    }

    const validTypes = ['SERVICE', 'GIFT_CERT_PURCHASE', 'TIP', 'OTHER'];
    if (!type || !validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        error: `type is required and must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    const validPaymentMethods = ['CASH', 'CARD', 'GIFT_CERTIFICATE', 'MIXED'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      res.status(400).json({
        success: false,
        error: `paymentMethod is required and must be one of: ${validPaymentMethods.join(', ')}`,
      });
      return;
    }

    // Optionally validate the appointmentId exists
    if (appointmentId) {
      const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appt) {
        res.status(404).json({ success: false, error: 'Appointment not found' });
        return;
      }
    }

    let revenueDate: Date = new Date();
    if (date) {
      const parsed = parseISO(date);
      if (!isValid(parsed)) {
        res.status(400).json({ success: false, error: 'Invalid date format. Use ISO 8601.' });
        return;
      }
      revenueDate = parsed;
    }

    const revenue = await prisma.revenue.create({
      data: {
        amount: parsedAmount,
        type,
        paymentMethod,
        notes: notes ?? null,
        date: revenueDate,
        ...(appointmentId ? { appointmentId } : {}),
      },
      include: {
        appointment: {
          include: {
            customer: { select: { name: true } },
            staff: { select: { name: true } },
            service: { select: { name: true, category: true } },
          },
        },
      },
    });

    res.status(201).json({ success: true, data: revenue });
  } catch (err) {
    console.error('[recordRevenue]', err);
    res.status(500).json({ success: false, error: 'Failed to record revenue' });
  }
}

// ---------------------------------------------------------------------------
// getTopServices — GET /revenue/top-services
// ---------------------------------------------------------------------------

export async function getTopServices(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        const s = parseISO(startDate);
        if (!isValid(s)) {
          res.status(400).json({ success: false, error: 'Invalid startDate' });
          return;
        }
        dateFilter.gte = startOfDay(s);
      }
      if (endDate) {
        const e = parseISO(endDate);
        if (!isValid(e)) {
          res.status(400).json({ success: false, error: 'Invalid endDate' });
          return;
        }
        dateFilter.lte = endOfDay(e);
      }
      where.date = dateFilter;
    }

    // Pull completed appointments with service info and revenue in range
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'COMPLETED',
        ...(Object.keys(where).length > 0
          ? {
              revenue: {
                some: { date: where.date as Record<string, Date> },
              },
            }
          : {}),
      },
      include: {
        service: { select: { name: true, category: true } },
        revenue: { where },
      },
    });

    // Group by service category
    const categoryMap: Record<
      string,
      { category: string; totalRevenue: number; appointmentCount: number; services: Record<string, { name: string; revenue: number; count: number }> }
    > = {};

    for (const appt of appointments) {
      const category = appt.service.category;
      const serviceName = appt.service.name;
      const revenueTotal = appt.revenue.reduce((sum, r) => sum + r.amount, 0);

      if (!categoryMap[category]) {
        categoryMap[category] = { category, totalRevenue: 0, appointmentCount: 0, services: {} };
      }
      categoryMap[category].totalRevenue += revenueTotal;
      categoryMap[category].appointmentCount += 1;

      if (!categoryMap[category].services[serviceName]) {
        categoryMap[category].services[serviceName] = { name: serviceName, revenue: 0, count: 0 };
      }
      categoryMap[category].services[serviceName].revenue += revenueTotal;
      categoryMap[category].services[serviceName].count += 1;
    }

    const data = Object.values(categoryMap)
      .map((cat) => ({
        category: cat.category,
        totalRevenue: cat.totalRevenue,
        appointmentCount: cat.appointmentCount,
        services: Object.values(cat.services).sort((a, b) => b.revenue - a.revenue),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getTopServices]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch top services' });
  }
}

// ---------------------------------------------------------------------------
// getTopStaff — GET /revenue/top-staff
// ---------------------------------------------------------------------------

export async function getTopStaff(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;

    const revenueWhere: Record<string, unknown> = {};
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        const s = parseISO(startDate);
        if (!isValid(s)) {
          res.status(400).json({ success: false, error: 'Invalid startDate' });
          return;
        }
        dateFilter.gte = startOfDay(s);
      }
      if (endDate) {
        const e = parseISO(endDate);
        if (!isValid(e)) {
          res.status(400).json({ success: false, error: 'Invalid endDate' });
          return;
        }
        dateFilter.lte = endOfDay(e);
      }
      revenueWhere.date = dateFilter;
    }

    // Fetch all completed appointments with staff and revenue
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'COMPLETED',
        ...(Object.keys(revenueWhere).length > 0
          ? { revenue: { some: { date: revenueWhere.date as Record<string, Date> } } }
          : {}),
      },
      include: {
        staff: { select: { id: true, name: true } },
        service: { select: { name: true, category: true } },
        revenue: { where: revenueWhere },
      },
    });

    // Group by staff
    const staffMap: Record<
      string,
      { staffId: string; staffName: string; totalRevenue: number; appointmentCount: number; totalTips: number; serviceRevenue: number }
    > = {};

    for (const appt of appointments) {
      const staffId = appt.staff.id;
      const staffName = appt.staff.name;

      if (!staffMap[staffId]) {
        staffMap[staffId] = {
          staffId,
          staffName,
          totalRevenue: 0,
          appointmentCount: 0,
          totalTips: 0,
          serviceRevenue: 0,
        };
      }

      staffMap[staffId].appointmentCount += 1;

      for (const r of appt.revenue) {
        staffMap[staffId].totalRevenue += r.amount;
        if (r.type === 'TIP') staffMap[staffId].totalTips += r.amount;
        if (r.type === 'SERVICE') staffMap[staffId].serviceRevenue += r.amount;
      }
    }

    const data = Object.values(staffMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getTopStaff]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch top staff revenue' });
  }
}
