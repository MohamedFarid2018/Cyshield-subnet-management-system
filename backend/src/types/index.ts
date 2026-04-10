import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

export interface User {
  UserId: number;
  Email: string;
  PasswordHash: string;
  Role: string;
  CreatedAt: Date;
}

export interface Subnet {
  SubnetId: number;
  SubnetName: string;
  SubnetAddress: string;
  CreatedBy: number;
  CreatedAt: Date;
  DeletedAt?: Date | null;
}

export interface IP {
  IpId: number;
  IpAddress: string;
  SubnetId: number;
  CreatedBy: number;
  CreatedAt: Date;
  DeletedAt?: Date | null;
}

export interface AuditLog {
  LogId: number;
  UserId: number;
  Action: string;
  Table: string;
  RecordId: number;
  OldValues?: string;
  NewValues?: string;
  CreatedAt: Date;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
