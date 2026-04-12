export interface User {
  userId: number;
  email: string;
  role: string;
}

export interface Subnet {
  SubnetId: number;
  SubnetName: string;
  SubnetAddress: string;
  CreatedBy: number;
  CreatedByEmail: string;
  CreatedAt: string;
  UpdatedAt: string | null;
  IpCount: number;
}

export interface IP {
  IpId: number;
  IpAddress: string;
  SubnetId: number;
  CreatedBy: number;
  CreatedByEmail: string;
  CreatedAt: string;
  UpdatedAt: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NetworkInfo {
  networkAddress: string;
  broadcastAddress: string;
  firstUsable: string;
  lastUsable: string;
  totalHosts: number;
  usableHosts: number;
  prefixLength: number;
}

export interface SubnetDetail extends Subnet {
  networkInfo: NetworkInfo;
}

export interface UploadResult {
  row: number;
  status: 'success' | 'skipped' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export interface UploadResponse {
  message: string;
  summary: {
    total: number;
    success: number;
    skipped: number;
    errors: number;
  };
  results: UploadResult[];
}
