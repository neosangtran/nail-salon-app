import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// GET /staff
export const getAllStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      isActive,
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
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
        include: {
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.staff.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        staff,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('[getAllStaff]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff' });
  }
};

// GET /staff/:id
export const getStaffById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        appointments: {
          orderBy: { date: 'desc' },
          take: 5,
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            service: { select: { id: true, name: true, price: true } },
          },
        },
        commissions: true,
      },
    });

    if (!staff) {
      res.status(404).json({ success: false, error: 'Staff member not found' });
      return;
    }

    const commissionsSummary = {
      total: staff.commissions.length,
      totalAmount: staff.commissions.reduce((sum, c) => sum + c.amount, 0),
      paidAmount: staff.commissions
        .filter((c) => c.isPaid)
        .reduce((sum, c) => sum + c.amount, 0),
      unpaidAmount: staff.commissions
        .filter((c) => !c.isPaid)
        .reduce((sum, c) => sum + c.amount, 0),
    };

    const { commissions: _commissions, ...staffData } = staff;

    res.status(200).json({
      success: true,
      data: {
        ...staffData,
        commissionsSummary,
      },
    });
  } catch (error) {
    console.error('[getStaffById]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff member' });
  }
};

// POST /staff
export const createStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      hireDate,
      specialization,
      commissionRate,
      password,
    } = req.body;

    if (!name || !email || !password || !hireDate) {
      res.status(400).json({
        success: false,
        error: 'name, email, password, and hireDate are required',
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ success: false, error: 'A user with that email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'STAFF',
          name,
        },
      });

      const staff = await tx.staff.create({
        data: {
          userId: user.id,
          name,
          email,
          phone: phone ?? null,
          hireDate: new Date(hireDate),
          specialization: specialization ?? null,
          commissionRate: commissionRate !== undefined ? parseFloat(commissionRate) : 0.4,
        },
        include: {
          user: {
            select: { email: true, role: true },
          },
        },
      });

      return staff;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('[createStaff]', error);
    res.status(500).json({ success: false, error: 'Failed to create staff member' });
  }
};

// PUT /staff/:id
export const updateStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      hireDate,
      specialization,
      photoUrl,
      commissionRate,
      isActive,
    } = req.body;

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Staff member not found' });
      return;
    }

    if (email && email !== existing.email) {
      const conflict = await prisma.user.findUnique({ where: { email } });
      if (conflict && conflict.id !== existing.userId) {
        res.status(409).json({ success: false, error: 'That email is already in use' });
        return;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const staffUpdateData: Record<string, unknown> = {};
      if (name !== undefined) staffUpdateData.name = name;
      if (email !== undefined) staffUpdateData.email = email;
      if (phone !== undefined) staffUpdateData.phone = phone;
      if (hireDate !== undefined) staffUpdateData.hireDate = new Date(hireDate);
      if (specialization !== undefined) staffUpdateData.specialization = specialization;
      if (photoUrl !== undefined) staffUpdateData.photoUrl = photoUrl;
      if (commissionRate !== undefined) staffUpdateData.commissionRate = parseFloat(commissionRate);
      if (isActive !== undefined) staffUpdateData.isActive = Boolean(isActive);

      const staff = await tx.staff.update({
        where: { id },
        data: staffUpdateData,
        include: {
          user: { select: { email: true, role: true } },
        },
      });

      if (email !== undefined || name !== undefined) {
        const userUpdateData: Record<string, unknown> = {};
        if (email !== undefined) userUpdateData.email = email;
        if (name !== undefined) userUpdateData.name = name;
        await tx.user.update({
          where: { id: existing.userId },
          data: userUpdateData,
        });
      }

      return staff;
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('[updateStaff]', error);
    res.status(500).json({ success: false, error: 'Failed to update staff member' });
  }
};

// DELETE /staff/:id  (soft delete)
export const deleteStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Staff member not found' });
      return;
    }

    const staff = await prisma.staff.update({
      where: { id },
      data: { isActive: false },
      include: {
        user: { select: { email: true, role: true } },
      },
    });

    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    console.error('[deleteStaff]', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate staff member' });
  }
};

// GET /staff/:id/schedule?startDate=&endDate=
export const getStaffSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query as Record<string, string>;

    const staff = await prisma.staff.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!staff) {
      res.status(404).json({ success: false, error: 'Staff member not found' });
      return;
    }

    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        staffId: id,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true, duration: true, price: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        staff,
        appointments,
        total: appointments.length,
      },
    });
  } catch (error) {
    console.error('[getStaffSchedule]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff schedule' });
  }
};
