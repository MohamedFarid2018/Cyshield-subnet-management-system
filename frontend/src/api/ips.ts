import api from './axios';
import type { IP, PaginatedResponse } from '../types';

export async function getIPs(
  subnetId: number,
  page = 1,
  limit = 10,
  search = ''
): Promise<PaginatedResponse<IP>> {
  const { data } = await api.get(`/subnets/${subnetId}/ips`, {
    params: { page, limit, search },
  });
  return data;
}

export async function addIP(subnetId: number, IpAddress: string): Promise<void> {
  await api.post(`/subnets/${subnetId}/ips`, { IpAddress });
}

export async function updateIP(
  subnetId: number,
  ipId: number,
  IpAddress: string
): Promise<void> {
  await api.put(`/subnets/${subnetId}/ips/${ipId}`, { IpAddress });
}

export async function deleteIP(subnetId: number, ipId: number): Promise<void> {
  await api.delete(`/subnets/${subnetId}/ips/${ipId}`);
}

export function exportIPsCSV(ips: IP[], subnetAddress: string): void {
  const header = 'IpId,IpAddress,SubnetAddress,CreatedByEmail,CreatedAt';
  const rows = ips.map(
    (i) =>
      `${i.IpId},"${i.IpAddress}","${subnetAddress}","${i.CreatedByEmail}","${i.CreatedAt}"`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ips-subnet-${subnetAddress}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
