import api from './axios';
import type { PaginatedResponse, Subnet, SubnetDetail } from '../types';

export async function getSubnets(
  page = 1,
  limit = 10,
  search = ''
): Promise<PaginatedResponse<Subnet>> {
  const { data } = await api.get('/subnets', { params: { page, limit, search } });
  return data;
}

export async function getSubnet(id: number): Promise<SubnetDetail> {
  const { data } = await api.get(`/subnets/${id}`);
  return data;
}

export async function createSubnet(
  SubnetName: string,
  SubnetAddress: string
): Promise<{ SubnetId: number }> {
  const { data } = await api.post('/subnets', { SubnetName, SubnetAddress });
  return data;
}

export async function updateSubnet(
  id: number,
  payload: { SubnetName?: string; SubnetAddress?: string }
): Promise<void> {
  await api.put(`/subnets/${id}`, payload);
}

export async function deleteSubnet(id: number): Promise<void> {
  await api.delete(`/subnets/${id}`);
}

export function exportSubnetsCSV(subnets: Subnet[]): void {
  const header = 'SubnetId,SubnetName,SubnetAddress,CreatedByEmail,CreatedAt,IpCount';
  const rows = subnets.map(
    (s) =>
      `${s.SubnetId},"${s.SubnetName}","${s.SubnetAddress}","${s.CreatedByEmail}","${s.CreatedAt}",${s.IpCount}`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'subnets.csv';
  a.click();
  URL.revokeObjectURL(url);
}
