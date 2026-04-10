import request from 'supertest';
import app from '../../src/app';
import { truncateAll } from '../setup/db';
import { createAndLogin, TestUser } from '../setup/authHelper';

let admin: TestUser;
let user: TestUser;
let otherUser: TestUser;

beforeEach(async () => {
  await truncateAll();
  admin     = await createAndLogin('admin@test.com',     'Admin@1234', 'admin');
  user      = await createAndLogin('user@test.com',      'User@12345', 'user');
  otherUser = await createAndLogin('other@test.com',     'Other@1234', 'user');
});

async function createSubnet(token: string, name = 'Test LAN', address = '10.0.0.0/24') {
  return request(app)
    .post('/api/subnets')
    .set('Authorization', `Bearer ${token}`)
    .send({ SubnetName: name, SubnetAddress: address });
}

describe('POST /api/subnets', () => {
  it('creates a subnet and returns 201', async () => {
    const res = await createSubnet(user.token);
    expect(res.status).toBe(201);
    expect(res.body.SubnetId).toBeDefined();
  });

  it('returns 400 for invalid CIDR', async () => {
    const res = await createSubnet(user.token, 'Bad', '192.168.1.1');
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate subnet address', async () => {
    await createSubnet(user.token);
    const res = await createSubnet(user.token);
    expect(res.status).toBe(409);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/subnets').send({ SubnetName: 'X', SubnetAddress: '10.0.0.0/24' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/subnets', () => {
  it('user only sees their own subnets', async () => {
    await createSubnet(user.token, 'User subnet', '10.1.0.0/24');
    await createSubnet(admin.token, 'Admin subnet', '10.2.0.0/24');

    const res = await request(app)
      .get('/api/subnets')
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].SubnetName).toBe('User subnet');
  });

  it('admin sees all subnets', async () => {
    await createSubnet(user.token, 'User subnet', '10.1.0.0/24');
    await createSubnet(admin.token, 'Admin subnet', '10.2.0.0/24');

    const res = await request(app)
      .get('/api/subnets')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('supports search filtering', async () => {
    await createSubnet(user.token, 'Office LAN', '10.1.0.0/24');
    await createSubnet(user.token, 'DMZ', '10.2.0.0/24');

    const res = await request(app)
      .get('/api/subnets?search=Office')
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].SubnetName).toBe('Office LAN');
  });

  it('returns paginated results', async () => {
    await createSubnet(user.token, 'Net 1', '10.1.0.0/24');
    await createSubnet(user.token, 'Net 2', '10.2.0.0/24');
    await createSubnet(user.token, 'Net 3', '10.3.0.0/24');

    const res = await request(app)
      .get('/api/subnets?page=1&limit=2')
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.totalPages).toBe(2);
    expect(res.body.total).toBe(3);
  });
});

describe('PUT /api/subnets/:id', () => {
  it('owner can update their subnet', async () => {
    const created = await createSubnet(user.token);
    const id = created.body.SubnetId;

    const res = await request(app)
      .put(`/api/subnets/${id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ SubnetName: 'Updated Name' });

    expect(res.status).toBe(200);
  });

  it('other user cannot update someone else\'s subnet', async () => {
    const created = await createSubnet(user.token);
    const id = created.body.SubnetId;

    const res = await request(app)
      .put(`/api/subnets/${id}`)
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({ SubnetName: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it('admin can update any subnet', async () => {
    const created = await createSubnet(user.token);
    const id = created.body.SubnetId;

    const res = await request(app)
      .put(`/api/subnets/${id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ SubnetName: 'Admin Updated' });

    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid CIDR on update', async () => {
    const created = await createSubnet(user.token);
    const id = created.body.SubnetId;

    const res = await request(app)
      .put(`/api/subnets/${id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ SubnetAddress: '999.999.999.999' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/subnets/:id', () => {
  it('owner can delete their subnet', async () => {
    const created = await createSubnet(user.token);
    const id = created.body.SubnetId;

    const res = await request(app)
      .delete(`/api/subnets/${id}`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(200);
  });

  it('other user cannot delete someone else\'s subnet', async () => {
    const created = await createSubnet(user.token);
    const id = created.body.SubnetId;

    const res = await request(app)
      .delete(`/api/subnets/${id}`)
      .set('Authorization', `Bearer ${otherUser.token}`);

    expect(res.status).toBe(403);
  });

  it('admin can delete any subnet', async () => {
    const created = await createSubnet(user.token);
    const id = created.body.SubnetId;

    const res = await request(app)
      .delete(`/api/subnets/${id}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
  });

  it('returns 404 for already deleted subnet', async () => {
    const created = await createSubnet(user.token);
    const id = created.body.SubnetId;
    await request(app).delete(`/api/subnets/${id}`).set('Authorization', `Bearer ${user.token}`);

    const res = await request(app)
      .delete(`/api/subnets/${id}`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(404);
  });
});
