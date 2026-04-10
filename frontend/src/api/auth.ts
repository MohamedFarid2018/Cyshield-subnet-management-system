import api from './axios';
import type { User } from '../types';

export async function login(email: string, password: string): Promise<{ accessToken: string; user: User }> {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function register(email: string, password: string): Promise<void> {
  await api.post('/auth/register', { email, password });
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}
