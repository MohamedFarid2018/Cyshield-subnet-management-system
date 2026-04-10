import request from 'supertest';
import app from '../../src/app';
import { truncateAll } from '../setup/db';
import { createAndLogin, TestUser } from '../setup/authHelper';

let admin: TestUser;
let user: TestUser;
let otherUser: TestUser;
let subnetId: number;

beforeEach(async () => {
  await truncateAll();
  admin     = await createAndLogin('admin@test.com', 'Admin@1234', 'admin');
  user      = await createAndLogin('user@test.com',  'User@12345', 'user');
  otherUser = await createAndLogin('other@test.com', 'Other@1234', 'user');

  const res = await request(app)
    .post('/api/subnets')
    .set('Authorization', `Bearer ${user.token}`)
    .send({ SubnetName: 'Test LAN', SubnetAddress: '192.168.1.0/24' });
  subnetId = res.body.SubnetId;
});

describe('POST /api/subnets/:subnetId/ips', () => {
  it('owner can add an IP to their subnet', async () => {
    const res = await request(app)
      .post(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ IpAddress: '192.168.1.10' });
    expect(res.status).toBe(201);
  });

  it('returns 400 for IP outside subnet range', async () => {
    const res = await request(app)
      .post(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ IpAddress: '10.0.0.1' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid IP format', async () => {
    const res = await request(app)
      .post(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ IpAddress: 'not-an-ip' });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate IP in same subnet', async () => {
    await request(app)
      .post(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ IpAddress: '192.168.1.10' });

    const res = await request(app)
      .post(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ IpAddress: '192.168.1.10' });
    expect(res.status).toBe(409);
  });

  it('other user cannot add IP to someone else\'s subnet', async () => {
    const res = await request(app)
      .post(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({ IpAddress: '192.168.1.20' });
    expect(res.status).toBe(403);
  });

  it('admin can add IP to any subnet', async () => {
    const res = await request(app)
      .post(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ IpAddress: '192.168.1.30' });
    expect(res.status).toBe(201);
  });
});

describe('GET /api/subnets/:subnetId/ips', () => {
  beforeEach(async () => {
    await request(app)
      .post(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ IpAddress: '192.168.1.10' });
  });

  it('owner can list IPs in their subnet', async () => {
    const res = await request(app)
      .get(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('other user cannot list IPs in someone else\'s subnet', async () => {
    const res = await request(app)
      .get(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${otherUser.token}`);
    expect(res.status).toBe(403);
  });

  it('admin can list IPs in any subnet', async () => {
    const res = await request(app)
      .get(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('PUT /api/subnets/:subnetId/ips/:ipId', () => {
  let ipId: number;

  beforeEach(async () => {
    const res = await request(app)
      .post(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ IpAddress: '192.168.1.10' });
    ipId = res.body.IpId;
  });

  it('owner can update their IP', async () => {
    const res = await request(app)
      .put(`/api/subnets/${subnetId}/ips/${ipId}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ IpAddress: '192.168.1.20' });
    expect(res.status).toBe(200);
  });

  it('other user cannot update someone else\'s IP', async () => {
    const res = await request(app)
      .put(`/api/subnets/${subnetId}/ips/${ipId}`)
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({ IpAddress: '192.168.1.99' });
    expect(res.status).toBe(403);
  });

  it('returns 400 if updated IP is outside subnet range', async () => {
    const res = await request(app)
      .put(`/api/subnets/${subnetId}/ips/${ipId}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ IpAddress: '10.0.0.1' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/subnets/:subnetId/ips/:ipId', () => {
  let ipId: number;

  beforeEach(async () => {
    const res = await request(app)
      .post(`/api/subnets/${subnetId}/ips`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ IpAddress: '192.168.1.10' });
    ipId = res.body.IpId;
  });

  it('owner can delete their IP', async () => {
    const res = await request(app)
      .delete(`/api/subnets/${subnetId}/ips/${ipId}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
  });

  it('other user cannot delete someone else\'s IP', async () => {
    const res = await request(app)
      .delete(`/api/subnets/${subnetId}/ips/${ipId}`)
      .set('Authorization', `Bearer ${otherUser.token}`);
    expect(res.status).toBe(403);
  });

  it('admin can delete any IP', async () => {
    const res = await request(app)
      .delete(`/api/subnets/${subnetId}/ips/${ipId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for already deleted IP', async () => {
    await request(app)
      .delete(`/api/subnets/${subnetId}/ips/${ipId}`)
      .set('Authorization', `Bearer ${user.token}`);

    const res = await request(app)
      .delete(`/api/subnets/${subnetId}/ips/${ipId}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(404);
  });
});
