import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../utils/db';
import { AuthRequest } from '../types';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.execute(
      'SELECT UserId FROM Users WHERE Email = ?',
      [email]
    );
    if ((rows as unknown[]).length > 0) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO Users (Email, PasswordHash, Role) VALUES (?, ?, ?)',
      [email, hash, 'user']
    );

    const insertId = (result as { insertId: number }).insertId;
    res.status(201).json({ message: 'Registration successful', userId: insertId });
  } catch (err) {
    console.error('[Auth] register error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.execute(
      'SELECT UserId, Email, PasswordHash, Role FROM Users WHERE Email = ?',
      [email]
    );
    const users = rows as {
      UserId: number;
      Email: string;
      PasswordHash: string;
      Role: string;
    }[];

    if (users.length === 0) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const user = users[0];
    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const payload = { userId: user.UserId, email: user.Email, role: user.Role };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: '15m',
    });

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: '7d' }
    );

    // Store refresh token (hashed) in DB
    const hashedRefresh = await bcrypt.hash(refreshToken, 8);
    await pool.execute(
      'UPDATE Users SET RefreshTokenHash = ? WHERE UserId = ?',
      [hashedRefresh, user.UserId]
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: { userId: user.UserId, email: user.Email, role: user.Role },
    });
  } catch (err) {
    console.error('[Auth] login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ message: 'No refresh token' });
    return;
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as { userId: number; email: string; role: string };

    const [rows] = await pool.execute(
      'SELECT RefreshTokenHash FROM Users WHERE UserId = ?',
      [payload.userId]
    );
    const users = rows as { RefreshTokenHash: string | null }[];
    if (!users[0]?.RefreshTokenHash) {
      res.status(401).json({ message: 'Session invalidated' });
      return;
    }

    const valid = await bcrypt.compare(token, users[0].RefreshTokenHash);
    if (!valid) {
      res.status(401).json({ message: 'Invalid refresh token' });
      return;
    }

    const newAccess = jwt.sign(
      { userId: payload.userId, email: payload.email, role: payload.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' }
    );

    res.json({ accessToken: newAccess });
  } catch {
    res.status(401).json({ message: 'Refresh token expired or invalid' });
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET as string
      ) as { userId: number };
      await pool.execute(
        'UPDATE Users SET RefreshTokenHash = NULL WHERE UserId = ?',
        [payload.userId]
      );
    } catch {
      // Token already invalid — still clear cookie
    }
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
}
