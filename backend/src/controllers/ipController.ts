import { Response } from 'express';
import pool from '../utils/db';
import { logAudit } from '../utils/audit';
import { isValidIPv4, ipBelongsToSubnet } from '../utils/network';
import { AuthRequest, PaginationQuery } from '../types';

async function getSubnet(subnetId: string) {
  const [rows] = await pool.execute(
    'SELECT * FROM Subnets WHERE SubnetId = ? AND DeletedAt IS NULL',
    [subnetId]
  );
  const list = rows as Record<string, unknown>[];
  return list.length > 0 ? list[0] : null;
}

export async function addIP(req: AuthRequest, res: Response): Promise<void> {
  const subnetId = req.params.subnetId as string;
  const { IpAddress } = req.body;
  const userId = req.user!.userId;

  if (!isValidIPv4(IpAddress)) {
    res.status(400).json({ message: 'Invalid IPv4 address format' });
    return;
  }

  try {
    const subnet = await getSubnet(subnetId);
    if (!subnet) {
      res.status(404).json({ message: 'Subnet not found' });
      return;
    }

    if (!ipBelongsToSubnet(IpAddress, subnet.SubnetAddress as string)) {
      res.status(400).json({
        message: `IP address does not belong to subnet ${subnet.SubnetAddress}`,
      });
      return;
    }

    const [existing] = await pool.execute(
      'SELECT IpId FROM IPs WHERE IpAddress = ? AND SubnetId = ? AND DeletedAt IS NULL',
      [IpAddress, subnetId]
    );
    if ((existing as unknown[]).length > 0) {
      res.status(409).json({ message: 'IP address already exists in this subnet' });
      return;
    }

    const [result] = await pool.execute(
      'INSERT INTO IPs (IpAddress, SubnetId, CreatedBy) VALUES (?, ?, ?)',
      [IpAddress, subnetId, userId]
    );
    const id = (result as { insertId: number }).insertId;
    await logAudit(userId, 'CREATE', 'IPs', id, undefined, { IpAddress, SubnetId: subnetId });
    res.status(201).json({ message: 'IP added', IpId: id });
  } catch (err) {
    console.error('[IP] add error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listIPs(req: AuthRequest, res: Response): Promise<void> {
  const subnetId = req.params.subnetId as string;
  const { page = '1', limit = '10', search = '' } = req.query as PaginationQuery;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  try {
    const subnet = await getSubnet(subnetId);
    if (!subnet) {
      res.status(404).json({ message: 'Subnet not found' });
      return;
    }

    const searchParam = `%${search}%`;
    const [rows] = await pool.execute(
      `SELECT i.IpId, i.IpAddress, i.SubnetId, i.CreatedBy, i.CreatedAt,
              u.Email AS CreatedByEmail
       FROM IPs i
       LEFT JOIN Users u ON u.UserId = i.CreatedBy
       WHERE i.SubnetId = ? AND i.DeletedAt IS NULL AND i.IpAddress LIKE ?
       ORDER BY INET_ATON(i.IpAddress)
       LIMIT ? OFFSET ?`,
      [subnetId, searchParam, limitNum, offset]
    );

    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM IPs WHERE SubnetId = ? AND DeletedAt IS NULL AND IpAddress LIKE ?',
      [subnetId, searchParam]
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
    console.error('[IP] list error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateIP(req: AuthRequest, res: Response): Promise<void> {
  const subnetId = req.params.subnetId as string;
  const ipId = req.params.ipId as string;
  const { IpAddress } = req.body;
  const userId = req.user!.userId;

  if (!isValidIPv4(IpAddress)) {
    res.status(400).json({ message: 'Invalid IPv4 address format' });
    return;
  }

  try {
    const subnet = await getSubnet(subnetId);
    if (!subnet) {
      res.status(404).json({ message: 'Subnet not found' });
      return;
    }

    if (!ipBelongsToSubnet(IpAddress, subnet.SubnetAddress as string)) {
      res.status(400).json({
        message: `IP address does not belong to subnet ${subnet.SubnetAddress}`,
      });
      return;
    }

    const [rows] = await pool.execute(
      'SELECT * FROM IPs WHERE IpId = ? AND SubnetId = ? AND DeletedAt IS NULL',
      [ipId, subnetId]
    );
    if ((rows as unknown[]).length === 0) {
      res.status(404).json({ message: 'IP not found' });
      return;
    }
    const old = (rows as Record<string, unknown>[])[0];

    await pool.execute('UPDATE IPs SET IpAddress = ? WHERE IpId = ?', [IpAddress, ipId]);
    await logAudit(userId, 'UPDATE', 'IPs', Number(ipId), old, { IpAddress });
    res.json({ message: 'IP updated' });
  } catch (err) {
    console.error('[IP] update error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteIP(req: AuthRequest, res: Response): Promise<void> {
  const subnetId = req.params.subnetId as string;
  const ipId = req.params.ipId as string;
  const userId = req.user!.userId;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM IPs WHERE IpId = ? AND SubnetId = ? AND DeletedAt IS NULL',
      [ipId, subnetId]
    );
    if ((rows as unknown[]).length === 0) {
      res.status(404).json({ message: 'IP not found' });
      return;
    }

    await pool.execute('UPDATE IPs SET DeletedAt = NOW() WHERE IpId = ?', [ipId]);
    await logAudit(userId, 'DELETE', 'IPs', Number(ipId));
    res.json({ message: 'IP deleted' });
  } catch (err) {
    console.error('[IP] delete error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}
