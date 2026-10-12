import { request } from './client';
import type { AdminUser, UserRole } from '../types';

export async function listUsers(): Promise<AdminUser[]> {
  return (await request<{ users: AdminUser[] }>('/admin/users')).users;
}

export async function updateUser(id: string, changes: { role?: UserRole; disabled?: boolean }): Promise<AdminUser> {
  return (await request<{ user: AdminUser }>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })).user;
}

export async function deleteUser(id: string): Promise<void> {
  await request<void>(`/admin/users/${id}`, { method: 'DELETE' });
}