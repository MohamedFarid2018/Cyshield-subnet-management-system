import { Response } from 'express';
import pool from '../utils/db';
import { logAudit } from '../utils/audit';
import { isValidCIDR, subnetInfo } from '../utils/network';
import { AuthRequest, PaginationQuery } from '../types';

function isAdmin(req: AuthRequest) {
  return req.user!.role === 'admin';
}

function ownsRecord(req: AuthRequest, createdBy: unknown) {
  return Number(createdBy) === Number(req.user!.userId);
}

export async function createSubnet(req: AuthRequest, res: Response): Promise<void> {
  const { SubnetName, SubnetAddress } = req.body;
  const userId = req.user!.userId;

  if (!isValidCIDR(SubnetAddress)) {
    res.status(400).json({ message: 'Invalid CIDR notation for SubnetAddress' });
    return;
  }

  try {
    const [existing] = await pool.execute(
      'SELECT SubnetId FROM Subnets WHERE SubnetAddress = ? AND DeletedAt IS NULL',
      [SubnetAddress]
    );
    if ((existing as unknown[]).length > 0) {
      res.status(409).json({ message: 'Subnet address already exists' });
      return;
    }

    const [result] = await pool.execute(
      'INSERT INTO Subnets (SubnetName, SubnetAddress, CreatedBy) VALUES (?, ?, ?)',
      [SubnetName, SubnetAddress, userId]
    );
    const id = (result as { insertId: number }).insertId;
    await logAudit(userId, 'CREATE', 'Subnets', id, undefined, { SubnetName, SubnetAddress });
    res.status(201).json({ message: 'Subnet created', SubnetId: id, ...subnetInfo(SubnetAddress) });
  } catch (err) {
    console.error('[Subnet] create error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listSubnets(req: AuthRequest, res: Response): Promise<void> {
  const { page = '1', limit = '10', search = '' } = req.query as PaginationQuery;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;
  const userId = req.user!.userId;
  const admin = isAdmin(req);

  try {
    const searchParam = `%${search}%`;

    // Admins see all subnets; regular users see only their own
    const ownerFilter = admin ? '' : 'AND s.CreatedBy = ?';
    const params = admin
      ? [searchParam, searchParam]
      : [searchParam, searchParam, userId];

    const [rows] = await pool.execute(
      `SELECT s.SubnetId, s.SubnetName, s.SubnetAddress, s.CreatedBy, s.CreatedAt,
              u.Email AS CreatedByEmail,
              COUNT(i.IpId) AS IpCount
       FROM Subnets s
       LEFT JOIN Users u ON u.UserId = s.CreatedBy
       LEFT JOIN IPs i ON i.SubnetId = s.SubnetId AND i.DeletedAt IS NULL
       WHERE s.DeletedAt IS NULL
         AND (s.SubnetName LIKE ? OR s.SubnetAddress LIKE ?)
         ${ownerFilter}
       GROUP BY s.SubnetId
       ORDER BY s.CreatedAt DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM Subnets s
       WHERE s.DeletedAt IS NULL
         AND (s.SubnetName LIKE ? OR s.SubnetAddress LIKE ?)
         ${ownerFilter}`,
      params
    );
    const total = (countRows as { total: number }[])[0].total;

    res.json({
      data: rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('[Subnet] list error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateSubnet(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { SubnetName, SubnetAddress } = req.body;
  const userId = req.user!.userId;

  if (SubnetAddress && !isValidCIDR(SubnetAddress)) {
    res.status(400).json({ message: 'Invalid CIDR notation for SubnetAddress' });
    return;
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM Subnets WHERE SubnetId = ? AND DeletedAt IS NULL',
      [id]
    );
    if ((rows as unknown[]).length === 0) {
      res.status(404).json({ message: 'Subnet not found' });
      return;
    }
    const old = (rows as Record<string, unknown>[])[0];

    if (!ownsRecord(req, old.CreatedBy) && !isAdmin(req)) {
      res.status(403).json({ message: 'You do not have permission to update this subnet' });
      return;
    }

    await pool.execute(
      `UPDATE Subnets SET
        SubnetName = COALESCE(?, SubnetName),
        SubnetAddress = COALESCE(?, SubnetAddress)
       WHERE SubnetId = ?`,
      [SubnetName ?? null, SubnetAddress ?? null, id]
    );
    await logAudit(userId, 'UPDATE', 'Subnets', Number(id), old, { SubnetName, SubnetAddress });
    res.json({ message: 'Subnet updated' });
  } catch (err) {
    console.error('[Subnet] update error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteSubnet(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM Subnets WHERE SubnetId = ? AND DeletedAt IS NULL',
      [id]
    );
    if ((rows as unknown[]).length === 0) {
      res.status(404).json({ message: 'Subnet not found' });
      return;
    }
    const subnet = (rows as Record<string, unknown>[])[0];

    if (!ownsRecord(req, subnet.CreatedBy) && !isAdmin(req)) {
      res.status(403).json({ message: 'You do not have permission to delete this subnet' });
      return;
    }

    await pool.execute('UPDATE Subnets SET DeletedAt = NOW() WHERE SubnetId = ?', [id]);
    await pool.execute(
      'UPDATE IPs SET DeletedAt = NOW() WHERE SubnetId = ? AND DeletedAt IS NULL',
      [id]
    );
    await logAudit(userId, 'DELETE', 'Subnets', Number(id));
    res.json({ message: 'Subnet deleted' });
  } catch (err) {
    console.error('[Subnet] delete error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getSubnetInfo(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT s.*, u.Email AS CreatedByEmail FROM Subnets s
       LEFT JOIN Users u ON u.UserId = s.CreatedBy
       WHERE s.SubnetId = ? AND s.DeletedAt IS NULL`,
      [id]
    );
    if ((rows as unknown[]).length === 0) {
      res.status(404).json({ message: 'Subnet not found' });
      return;
    }
    const subnet = (rows as Record<string, unknown>[])[0];

    if (!ownsRecord(req, subnet.CreatedBy) && !isAdmin(req)) {
      res.status(403).json({ message: 'You do not have permission to view this subnet' });
      return;
    }

    const info = subnetInfo(subnet.SubnetAddress as string);
    res.json({ ...subnet, networkInfo: info });
  } catch (err) {
    console.error('[Subnet] getInfo error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}
