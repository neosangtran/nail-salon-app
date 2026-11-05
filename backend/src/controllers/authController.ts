import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';

const prisma = new PrismaClient();

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, REFRESH_COOKIE_OPTIONS);
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  });
}

// POST /auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name, role } = req.body;

  // Validate required fields
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ success: false, error: 'Valid email is required' });
    return;
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    return;
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ success: false, error: 'Name is required' });
    return;
  }

  const allowedRoles = ['ADMIN', 'MANAGER', 'STAFF'];
  const assignedRole = role && allowedRoles.includes(role) ? role : 'STAFF';

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User and Staff in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name.trim(),
          role: assignedRole,
        },
      });

      await tx.staff.create({
        data: {
          userId: newUser.id,
          name: newUser.name,
          email: newUser.email,
          hireDate: new Date(),
          commissionRate: 0.4,
        },
      });

      return newUser;
    });

    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
        accessToken,
      },
    });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// POST /auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password are required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
        accessToken,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// POST /auth/logout
export async function logout(_req: Request, res: Response): Promise<void> {
  clearRefreshCookie(res);
  res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
}

// POST /auth/refresh
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!token) {
    res.status(401).json({ success: false, error: 'No refresh token provided' });
    return;
  }

  try {
    const decoded = verifyRefreshToken(token);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });

    res.status(200).json({ success: true, data: { accessToken } });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
}

// GET /auth/me
export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { staff: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { password: _password, ...safeUser } = user;

    res.status(200).json({ success: true, data: { user: safeUser } });
  } catch (err) {
    console.error('[getMe]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
