import { Response } from 'express';
import { Readable } from 'stream';
import csv from 'csv-parser';
import pool from '../utils/db';
import { logAudit } from '../utils/audit';
import { isValidCIDR, isValidIPv4, ipBelongsToSubnet } from '../utils/network';
import { AuthRequest } from '../types';

interface CsvRow {
  SubnetName?: string;
  SubnetAddress?: string;
  IpAddress?: string;
}

interface UploadResult {
  row: number;
  status: 'success' | 'skipped' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export async function uploadFile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  const userId = req.user!.userId;
  const results: UploadResult[] = [];
  let rowIndex = 0;

  // Cache subnets created during this upload to avoid repeated DB lookups
  const subnetCache: Record<string, number> = {};

  // Step 1: collect all rows from the stream synchronously
  const collectRows = (): Promise<CsvRow[]> =>
    new Promise((resolve, reject) => {
      const rows: CsvRow[] = [];
      const stream = Readable.from(req.file!.buffer);
      stream
        .pipe(csv({ strict: false }))
        .on('data', (row: CsvRow) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });

  // Step 2: process each row sequentially with full async/await support
  const processRows = async (): Promise<void> => {
    const rows = await collectRows();

    for (const row of rows) {
      rowIndex++;
      const currentRow = rowIndex;

      if (rowIndex > 5000) {
        results.push({ row: currentRow, status: 'error', message: 'Row limit of 5000 exceeded — remaining rows skipped' });
        break;
      }

      const subnetName = row.SubnetName?.trim();
      const subnetAddress = row.SubnetAddress?.trim();
      const ipAddress = row.IpAddress?.trim();

      if (!subnetAddress) {
        results.push({ row: currentRow, status: 'error', message: 'SubnetAddress is required' });
        continue;
      }

      if (!isValidCIDR(subnetAddress)) {
        results.push({ row: currentRow, status: 'error', message: `Invalid CIDR: ${subnetAddress}` });
        continue;
      }

      try {
        // Get or create subnet
        let subnetId = subnetCache[subnetAddress];

        if (!subnetId) {
          const [existingRows] = await pool.execute(
            'SELECT SubnetId FROM Subnets WHERE SubnetAddress = ? AND DeletedAt IS NULL',
            [subnetAddress]
          );
          const existing = existingRows as { SubnetId: number }[];

          if (existing.length > 0) {
            subnetId = existing[0].SubnetId;
          } else {
            const name = subnetName || subnetAddress;
            const [insertResult] = await pool.execute(
              'INSERT INTO Subnets (SubnetName, SubnetAddress, CreatedBy) VALUES (?, ?, ?)',
              [name, subnetAddress, userId]
            );
            subnetId = (insertResult as { insertId: number }).insertId;
            await logAudit(userId, 'CREATE', 'Subnets', subnetId, undefined, { SubnetName: name, SubnetAddress: subnetAddress });
          }
          subnetCache[subnetAddress] = subnetId;
        }

        // Handle IP if provided
        if (ipAddress) {
          if (!isValidIPv4(ipAddress)) {
            results.push({ row: currentRow, status: 'error', message: `Invalid IP address: ${ipAddress}` });
            continue;
          }

          if (!ipBelongsToSubnet(ipAddress, subnetAddress)) {
            results.push({
              row: currentRow,
              status: 'error',
              message: `IP ${ipAddress} does not belong to subnet ${subnetAddress}`,
            });
            continue;
          }

          const [ipExisting] = await pool.execute(
            'SELECT IpId FROM IPs WHERE IpAddress = ? AND SubnetId = ? AND DeletedAt IS NULL',
            [ipAddress, subnetId]
          );
          if ((ipExisting as unknown[]).length > 0) {
            results.push({ row: currentRow, status: 'skipped', message: `IP ${ipAddress} already exists` });
            continue;
          }

          const [ipResult] = await pool.execute(
            'INSERT INTO IPs (IpAddress, SubnetId, CreatedBy) VALUES (?, ?, ?)',
            [ipAddress, subnetId, userId]
          );
          const ipId = (ipResult as { insertId: number }).insertId;
          await logAudit(userId, 'CREATE', 'IPs', ipId, undefined, { IpAddress: ipAddress, SubnetId: subnetId });
          results.push({ row: currentRow, status: 'success', message: 'IP added', data: { subnetId, ipId, ipAddress } });
        } else {
          results.push({ row: currentRow, status: 'success', message: 'Subnet processed', data: { subnetId, subnetAddress } });
        }
      } catch (err) {
        results.push({ row: currentRow, status: 'error', message: 'Database error on this row' });
      }
    }
  };

  try {
    await processRows();

    const summary = {
      total: results.length,
      success: results.filter((r) => r.status === 'success').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
    };

    res.json({ message: 'Upload complete', summary, results });
  } catch (err) {
    console.error('[Upload] processing error:', err);
    res.status(500).json({ message: 'Failed to process file' });
  }
}
