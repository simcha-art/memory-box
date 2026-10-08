import { request } from './client';
import type { Category } from '../types';

export async function listCategories(): Promise<Category[]> {
  return (await request<{ categories: Category[] }>('/categories')).categories;
}

export async function createCategory(name: string): Promise<Category> {
  return (await request<{ category: Category }>('/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })).category;
}
