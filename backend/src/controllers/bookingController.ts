import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseISO, isValid, addMinutes, format, startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePaginationParams(query: Record<string, unknown>): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

/** Parse a "HH:MM" time string and apply it to a base Date, returning a new Date. */
function applyTime(base: Date, timeStr: string): Date | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  let d = setHours(base, hours);
  d = setMinutes(d, minutes);
  d.setSeconds(0, 0);
  return d;
}

/** Returns current period string as "YYYY-MM" for commission records */
function currentPeriod(): string {
  return format(new Date(), 'yyyy-MM');
}

/** Check whether two [start, end) intervals overlap. */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ---------------------------------------------------------------------------
// Appointment include shape (reusable)
// ---------------------------------------------------------------------------

const appointmentInclude = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  staff: { select: { id: true, name: true } },
  service: { select: { id: true, name: true, duration: true, price: true, category: true } },
} as const;

// ---------------------------------------------------------------------------
// getAllBookings — GET /bookings
// ---------------------------------------------------------------------------

export async function getAllBookings(req: Request, res: Response): Promise<void> {
  try {
    const {
      date,
      staffId,
      customerId,
      status,
      startDate,
      endDate,
    } = req.query as Record<string, string>;

    const { page, limit, skip } = parsePaginationParams(req.query);

    // Build date filter
    const dateFilter: Record<string, Date> = {};

    if (date) {
      const parsed = parseISO(date);
      if (!isValid(parsed)) {
        res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
        return;
      }
      dateFilter.gte = startOfDay(parsed);
      dateFilter.lte = endOfDay(parsed);
    } else {
      if (startDate) {
        const parsed = parseISO(startDate);
        if (!isValid(parsed)) {
          res.status(400).json({ success: false, error: 'Invalid startDate format. Use YYYY-MM-DD.' });
          return;
        }
        dateFilter.gte = startOfDay(parsed);
      }
      if (endDate) {
        const parsed = parseISO(endDate);
        if (!isValid(parsed)) {
          res.status(400).json({ success: false, error: 'Invalid endDate format. Use YYYY-MM-DD.' });
          return;
        }
        dateFilter.lte = endOfDay(parsed);
      }
    }

    const where: Record<string, unknown> = {};
    if (Object.keys(dateFilter).length > 0) where.date = dateFilter;
    if (staffId) where.staffId = staffId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: appointmentInclude,
        orderBy: { startTime: 'asc' },
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        appointments,
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
    console.error('[getAllBookings]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
  }
}

// ---------------------------------------------------------------------------
// getBookingById — GET /bookings/:id
// ---------------------------------------------------------------------------

export async function getBookingById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
        staff: { include: { user: { select: { email: true, role: true } } } },
        service: true,
        commissions: true,
        revenue: true,
      },
    });

    if (!appointment) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    console.error('[getBookingById]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch booking' });
  }
}

// ---------------------------------------------------------------------------
// createBooking — POST /bookings
// ---------------------------------------------------------------------------

export async function createBooking(req: Request, res: Response): Promise<void> {
  try {
    const { customerId, staffId, serviceId, date, startTime, notes } = req.body as {
      customerId?: string;
      staffId?: string;
      serviceId?: string;
      date?: string;
      startTime?: string;
      notes?: string;
    };

    // Required field validation
    if (!customerId || !staffId || !serviceId || !date || !startTime) {
      res.status(400).json({
        success: false,
        error: 'customerId, staffId, serviceId, date, and startTime are required',
      });
      return;
    }

    // Validate date
    const parsedDate = parseISO(date);
    if (!isValid(parsedDate)) {
      res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }

    // Parse startTime into a full DateTime on the given date
    const startDateTime = applyTime(parsedDate, startTime);
    if (!startDateTime) {
      res.status(400).json({ success: false, error: 'Invalid startTime format. Use HH:MM.' });
      return;
    }

    // Fetch service to get duration and price
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      res.status(404).json({ success: false, error: 'Service not found' });
      return;
    }
    if (!service.isActive) {
      res.status(400).json({ success: false, error: 'Service is not active' });
      return;
    }

    // Auto-calculate endTime from service duration (in minutes)
    const endDateTime = addMinutes(startDateTime, service.duration);

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    // Verify staff exists
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      res.status(404).json({ success: false, error: 'Staff not found' });
      return;
    }
    if (!staff.isActive) {
      res.status(400).json({ success: false, error: 'Staff member is not active' });
      return;
    }

    // Check for schedule conflicts: existing non-CANCELLED appointments for the same staff
    // that overlap with [startDateTime, endDateTime)
    const conflicting = await prisma.appointment.findFirst({
      where: {
        staffId,
        status: { not: 'CANCELLED' },
        AND: [
          { startTime: { lt: endDateTime } },
          { endTime: { gt: startDateTime } },
        ],
      },
    });

    if (conflicting) {
      res.status(409).json({ success: false, error: 'Staff not available at this time' });
      return;
    }

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        customerId,
        staffId,
        serviceId,
        date: startOfDay(parsedDate),
        startTime: startDateTime,
        endTime: endDateTime,
        status: 'PENDING',
        notes: notes ?? null,
        totalPrice: service.price,
        tip: 0,
        paymentStatus: 'UNPAID',
      },
      include: appointmentInclude,
    });

    res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    console.error('[createBooking]', err);
    res.status(500).json({ success: false, error: 'Failed to create booking' });
  }
}

// ---------------------------------------------------------------------------
// updateBooking — PUT /bookings/:id
// ---------------------------------------------------------------------------

export async function updateBooking(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, notes, paymentMethod, paymentStatus, tip, date, startTime } = req.body as {
      status?: string;
      notes?: string;
      paymentMethod?: string;
      paymentStatus?: string;
      tip?: number;
      date?: string;
      startTime?: string;
    };

    // Find existing booking
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    // Validate status if provided
    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    // Validate paymentMethod if provided
    const validPaymentMethods = ['CASH', 'CARD', 'GIFT_CERTIFICATE', 'MIXED'];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      res.status(400).json({
        success: false,
        error: `Invalid paymentMethod. Must be one of: ${validPaymentMethods.join(', ')}`,
      });
      return;
    }

    // Validate paymentStatus if provided
    const validPaymentStatuses = ['UNPAID', 'PAID', 'PARTIAL'];
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      res.status(400).json({
        success: false,
        error: `Invalid paymentStatus. Must be one of: ${validPaymentStatuses.join(', ')}`,
      });
      return;
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (tip !== undefined) {
      const parsedTip = parseFloat(String(tip));
      if (isNaN(parsedTip) || parsedTip < 0) {
        res.status(400).json({ success: false, error: 'tip must be a non-negative number' });
        return;
      }
      updateData.tip = parsedTip;
    }

    // Handle rescheduling (new date or startTime provided)
    if (date || startTime) {
      const baseDate = date ? parseISO(date) : existing.date;
      if (!isValid(baseDate)) {
        res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
        return;
      }

      // Determine new startTime string — use provided or parse from existing startTime
      let newStartTimeStr: string;
      if (startTime) {
        newStartTimeStr = startTime;
      } else {
        newStartTimeStr = format(existing.startTime, 'HH:mm');
      }

      const newStartDateTime = applyTime(baseDate, newStartTimeStr);
      if (!newStartDateTime) {
        res.status(400).json({ success: false, error: 'Invalid startTime format. Use HH:MM.' });
        return;
      }

      // Fetch the service to get duration
      const service = await prisma.service.findUnique({ where: { id: existing.serviceId } });
      if (!service) {
        res.status(404).json({ success: false, error: 'Associated service not found' });
        return;
      }

      const newEndDateTime = addMinutes(newStartDateTime, service.duration);

      // Re-run conflict check, excluding the current appointment
      const conflicting = await prisma.appointment.findFirst({
        where: {
          staffId: existing.staffId,
          status: { not: 'CANCELLED' },
          id: { not: id },
          AND: [
            { startTime: { lt: newEndDateTime } },
            { endTime: { gt: newStartDateTime } },
          ],
        },
      });

      if (conflicting) {
        res.status(409).json({ success: false, error: 'Staff not available at this time' });
        return;
      }

      updateData.date = startOfDay(baseDate);
      updateData.startTime = newStartDateTime;
      updateData.endTime = newEndDateTime;
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: appointmentInclude,
    });

    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    console.error('[updateBooking]', err);
    res.status(500).json({ success: false, error: 'Failed to update booking' });
  }
}

// ---------------------------------------------------------------------------
// cancelBooking — PUT /bookings/:id/cancel
// ---------------------------------------------------------------------------

export async function cancelBooking(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    if (existing.status === 'CANCELLED') {
      res.status(400).json({ success: false, error: 'Booking is already cancelled' });
      return;
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: appointmentInclude,
    });

    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    console.error('[cancelBooking]', err);
    res.status(500).json({ success: false, error: 'Failed to cancel booking' });
  }
}

// ---------------------------------------------------------------------------
// completeBooking — PUT /bookings/:id/complete
// ---------------------------------------------------------------------------

export async function completeBooking(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { staff: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    if (existing.status === 'COMPLETED') {
      res.status(400).json({ success: false, error: 'Booking is already completed' });
      return;
    }

    if (existing.status === 'CANCELLED') {
      res.status(400).json({ success: false, error: 'Cannot complete a cancelled booking' });
      return;
    }

    const paymentMethod = existing.paymentMethod ?? 'CASH';
    const serviceAmount = existing.totalPrice;
    const tipAmount = existing.tip ?? 0;
    const period = currentPeriod();
    const commissionRate = existing.staff.commissionRate;
    const commissionAmount = serviceAmount * commissionRate;

    // Atomic transaction: update appointment + create Revenue + create Commission
    const [appointment] = await prisma.$transaction([
      // 1. Mark appointment COMPLETED and PAID
      prisma.appointment.update({
        where: { id },
        data: { status: 'COMPLETED', paymentStatus: 'PAID' },
        include: appointmentInclude,
      }),

      // 2. Revenue record for the service
      prisma.revenue.create({
        data: {
          appointmentId: id,
          amount: serviceAmount,
          type: 'SERVICE',
          paymentMethod,
          date: new Date(),
          notes: `Service revenue for appointment ${id}`,
        },
      }),

      // 3. Revenue record for tip (if any)
      ...(tipAmount > 0
        ? [
            prisma.revenue.create({
              data: {
                appointmentId: id,
                amount: tipAmount,
                type: 'TIP',
                paymentMethod,
                date: new Date(),
                notes: `Tip for appointment ${id}`,
              },
            }),
          ]
        : []),

      // 4. Commission record for staff
      prisma.commission.create({
        data: {
          staffId: existing.staffId,
          appointmentId: id,
          amount: commissionAmount,
          rate: commissionRate,
          period,
          isPaid: false,
        },
      }),
    ]);

    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    console.error('[completeBooking]', err);
    res.status(500).json({ success: false, error: 'Failed to complete booking' });
  }
}

// ---------------------------------------------------------------------------
// checkAvailability — GET /bookings/availability?staffId=&date=&serviceId=
// ---------------------------------------------------------------------------

export async function checkAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { staffId, date, serviceId } = req.query as Record<string, string>;

    if (!staffId || !date) {
      res.status(400).json({ success: false, error: 'staffId and date are required' });
      return;
    }

    const parsedDate = parseISO(date);
    if (!isValid(parsedDate)) {
      res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }

    // Optionally fetch service duration for slot duration awareness
    let serviceDuration = 30; // default slot size
    if (serviceId) {
      const service = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!service) {
        res.status(404).json({ success: false, error: 'Service not found' });
        return;
      }
      serviceDuration = service.duration;
    }

    // Fetch all non-CANCELLED appointments for this staff on this date
    const dayStart = startOfDay(parsedDate);
    const dayEnd = endOfDay(parsedDate);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        staffId,
        status: { not: 'CANCELLED' },
        date: { gte: dayStart, lte: dayEnd },
      },
      select: { startTime: true, endTime: true, status: true },
      orderBy: { startTime: 'asc' },
    });

    // Generate 30-minute slots from 9:00 AM to 7:00 PM
    const SLOT_INTERVAL_MINUTES = 30;
    const DAY_START_HOUR = 9;   // 9 AM
    const DAY_END_HOUR = 19;    // 7 PM (last slot starts at 18:30)

    const slots: Array<{
      startTime: string;
      endTime: string;
      available: boolean;
      serviceEndTime?: string;
    }> = [];

    let slotStart = setMinutes(setHours(parsedDate, DAY_START_HOUR), 0);
    slotStart.setSeconds(0, 0);

    const dayEndTime = setMinutes(setHours(parsedDate, DAY_END_HOUR), 0);
    dayEndTime.setSeconds(0, 0);

    while (slotStart < dayEndTime) {
      const slotEnd = addMinutes(slotStart, SLOT_INTERVAL_MINUTES);

      // If a service is specified, check whether a full service duration fits
      const serviceEnd = addMinutes(slotStart, serviceDuration);

      // A slot is available if:
      // 1. The service would end by or before the day ends (if serviceId provided)
      // 2. No existing appointment overlaps [slotStart, serviceEnd)
      let isFitsInDay = true;
      if (serviceId && serviceEnd > dayEndTime) {
        isFitsInDay = false;
      }

      let hasConflict = false;
      for (const appt of existingAppointments) {
        const checkEnd = serviceId ? serviceEnd : slotEnd;
        if (overlaps(slotStart, checkEnd, appt.startTime, appt.endTime)) {
          hasConflict = true;
          break;
        }
      }

      slots.push({
        startTime: format(slotStart, 'HH:mm'),
        endTime: format(slotEnd, 'HH:mm'),
        available: isFitsInDay && !hasConflict,
        ...(serviceId
          ? { serviceEndTime: format(serviceEnd, 'HH:mm') }
          : {}),
      });

      slotStart = addMinutes(slotStart, SLOT_INTERVAL_MINUTES);
    }

    res.status(200).json({
      success: true,
      data: {
        staffId,
        date,
        serviceId: serviceId ?? null,
        serviceDuration,
        slots,
        bookedAppointments: existingAppointments.map((a) => ({
          startTime: format(a.startTime, 'HH:mm'),
          endTime: format(a.endTime, 'HH:mm'),
          status: a.status,
        })),
      },
    });
  } catch (err) {
    console.error('[checkAvailability]', err);
    res.status(500).json({ success: false, error: 'Failed to check availability' });
  }
}
