import request from 'supertest';
import app from '../../src/app';

export interface TestUser {
  token: string;
  userId: number;
  email: string;
  role: string;
}

export async function createAndLogin(
  email: string,
  password: string,
  role: 'user' | 'admin' = 'user'
): Promise<TestUser> {
  // Register
  await request(app).post('/api/auth/register').send({ email, password });

  // If admin role needed, update directly via DB
  if (role === 'admin') {
    const pool = (await import('../../src/utils/db')).default;
    await pool.execute('UPDATE Users SET Role = ? WHERE Email = ?', ['admin', email]);
  }

  // Login
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return {
    token: res.body.accessToken,
    userId: res.body.user.userId,
    email: res.body.user.email,
    role: res.body.user.role,
  };
}
