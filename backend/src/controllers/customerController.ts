import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /customers
// Query params: search, page, limit, sortBy, sortOrder
export async function getAllCustomers(req: Request, res: Response): Promise<void> {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const validSortFields = ['name', 'loyaltyPoints', 'createdAt'] as const;
    type SortField = typeof validSortFields[number];
    const sortBy: SortField = validSortFields.includes(req.query.sortBy as SortField)
      ? (req.query.sortBy as SortField)
      : 'createdAt';
    const sortOrder: 'asc' | 'desc' = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          birthday: true,
          notes: true,
          loyaltyPoints: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        customers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('[getAllCustomers]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
}

// GET /customers/:id
export async function getCustomerById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        appointments: {
          orderBy: { date: 'desc' },
          take: 10,
          select: {
            id: true,
            date: true,
            status: true,
            totalPrice: true,
            service: { select: { name: true } },
            staff: { select: { name: true } },
          },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    // Flatten service/staff names for convenience
    const data = {
      ...customer,
      appointments: customer.appointments.map((appt) => ({
        id: appt.id,
        date: appt.date,
        status: appt.status,
        totalPrice: appt.totalPrice,
        serviceName: appt.service.name,
        staffName: appt.staff.name,
      })),
    };

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[getCustomerById]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch customer' });
  }
}

// POST /customers
export async function createCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { name, phone, email, birthday, notes } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ success: false, error: 'Customer name is required' });
      return;
    }

    // Duplicate check
    if (phone || email) {
      const orConditions: Array<{ phone?: string; email?: string }> = [];
      if (phone) orConditions.push({ phone: phone.trim() });
      if (email) orConditions.push({ email: email.trim() });

      const existing = await prisma.customer.findFirst({
        where: { OR: orConditions },
        select: { id: true, phone: true, email: true },
      });

      if (existing) {
        const conflict =
          existing.phone === phone?.trim() ? 'phone number' : 'email address';
        res.status(409).json({
          success: false,
          error: `A customer with that ${conflict} already exists`,
        });
        return;
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        birthday: birthday ? new Date(birthday) : null,
        notes: notes ? notes.trim() : null,
      },
    });

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    console.error('[createCustomer]', err);
    res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
}

// PUT /customers/:id
export async function updateCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, phone, email, birthday, notes, loyaltyPoints } = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    // Duplicate phone/email check (exclude current customer)
    if (phone !== undefined || email !== undefined) {
      const orConditions: Array<{ phone?: string; email?: string }> = [];
      if (phone !== undefined && phone !== null) orConditions.push({ phone: phone.trim() });
      if (email !== undefined && email !== null) orConditions.push({ email: email.trim() });

      if (orConditions.length > 0) {
        const conflict = await prisma.customer.findFirst({
          where: {
            OR: orConditions,
            NOT: { id },
          },
          select: { id: true, phone: true, email: true },
        });

        if (conflict) {
          const field =
            conflict.phone === phone?.trim() ? 'phone number' : 'email address';
          res.status(409).json({
            success: false,
            error: `Another customer already uses that ${field}`,
          });
          return;
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (email !== undefined) updateData.email = email ? email.trim() : null;
    if (birthday !== undefined) updateData.birthday = birthday ? new Date(birthday) : null;
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
    if (loyaltyPoints !== undefined) updateData.loyaltyPoints = Number(loyaltyPoints);

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('[updateCustomer]', err);
    res.status(500).json({ success: false, error: 'Failed to update customer' });
  }
}

// DELETE /customers/:id
export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    // Block deletion if the customer has future appointments
    const futureAppointments = await prisma.appointment.count({
      where: {
        customerId: id,
        date: { gte: new Date() },
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
      },
    });

    if (futureAppointments > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete customer — they have ${futureAppointments} upcoming appointment${futureAppointments !== 1 ? 's' : ''}. Cancel or complete those appointments first.`,
      });
      return;
    }

    await prisma.customer.delete({ where: { id } });

    res.status(200).json({ success: true, data: { message: 'Customer deleted successfully' } });
  } catch (err) {
    console.error('[deleteCustomer]', err);
    res.status(500).json({ success: false, error: 'Failed to delete customer' });
  }
}

// GET /customers/:id/visits
export async function getCustomerVisits(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    const [visits, total] = await Promise.all([
      prisma.appointment.findMany({
        where: { customerId: id },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
          totalPrice: true,
          tip: true,
          paymentMethod: true,
          paymentStatus: true,
          notes: true,
          service: { select: { name: true, category: true } },
          staff: { select: { name: true } },
        },
      }),
      prisma.appointment.count({ where: { customerId: id } }),
    ]);

    const formattedVisits = visits.map((v) => ({
      id: v.id,
      date: v.date,
      startTime: v.startTime,
      endTime: v.endTime,
      status: v.status,
      totalPrice: v.totalPrice,
      tip: v.tip,
      paymentMethod: v.paymentMethod,
      paymentStatus: v.paymentStatus,
      notes: v.notes,
      serviceName: v.service.name,
      serviceCategory: v.service.category,
      staffName: v.staff.name,
    }));

    res.status(200).json({
      success: true,
      data: {
        customer,
        visits: formattedVisits,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('[getCustomerVisits]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch customer visits' });
  }
}

// POST /customers/:id/loyalty
export async function addLoyaltyPoints(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { points, reason } = req.body;

    if (points === undefined || points === null) {
      res.status(400).json({ success: false, error: 'points is required' });
      return;
    }

    const pointsValue = Number(points);
    if (!Number.isFinite(pointsValue) || !Number.isInteger(pointsValue)) {
      res.status(400).json({ success: false, error: 'points must be an integer' });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    const newTotal = customer.loyaltyPoints + pointsValue;
    if (newTotal < 0) {
      res.status(400).json({
        success: false,
        error: `Cannot subtract ${Math.abs(pointsValue)} points — customer only has ${customer.loyaltyPoints} point${customer.loyaltyPoints !== 1 ? 's' : ''}`,
      });
      return;
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { loyaltyPoints: newTotal },
    });

    res.status(200).json({
      success: true,
      data: {
        customerId: updated.id,
        customerName: updated.name,
        pointsAdded: pointsValue,
        reason: reason || null,
        previousTotal: customer.loyaltyPoints,
        newTotal: updated.loyaltyPoints,
      },
    });
  } catch (err) {
    console.error('[addLoyaltyPoints]', err);
    res.status(500).json({ success: false, error: 'Failed to update loyalty points' });
  }
}
