import request from 'supertest';
import app from '../../src/app';
import { truncateAll } from '../setup/db';

beforeEach(async () => { await truncateAll(); });

describe('POST /api/auth/register', () => {
  const valid = { email: 'test@example.com', password: 'Test@1234' };

  it('registers a new user and returns 201', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.userId).toBeDefined();
  });

  it('returns 409 if email already registered', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: 'Test@1234' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for weak password (no uppercase)', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@example.com', password: 'test@1234' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for weak password (no special character)', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@example.com', password: 'TestTest1234' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@example.com', password: 'T@1' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  const creds = { email: 'login@example.com', password: 'Login@1234' };

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(creds);
  });

  it('returns access token on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send(creds);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(creds.email);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ ...creds, password: 'Wrong@9999' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unregistered email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Test@1234' });
    expect(res.status).toBe(401);
  });

  it('sets refreshToken HttpOnly cookie on login', async () => {
    const res = await request(app).post('/api/auth/login').send(creds);
    const cookies = (res.headers['set-cookie'] as unknown) as string[];
    expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true);
    expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);
  });
});
