import { downloadFile, jsonBody, request } from './client';
import type { ItemInput, MemoryItem } from '../types';

export async function listItems(): Promise<MemoryItem[]> {
  return (await request<{ items: MemoryItem[] }>('/items')).items;
}

export async function searchItems(query: string): Promise<MemoryItem[]> {
  return (await request<{ items: MemoryItem[] }>(`/items/search?q=${encodeURIComponent(query)}`)).items;
}

export async function getRelatedItems(id: string): Promise<MemoryItem[]> {
  return (await request<{ items: MemoryItem[] }>(`/items/${id}/related`)).items;
}

export async function saveItem(input: ItemInput, file: File | undefined, existingItem?: MemoryItem): Promise<MemoryItem> {
  const form = new FormData();
  Object.entries({ ...input, tags: input.tags.join(',') }).forEach(([key, value]) => {
    form.append(key, String(value));
  });
  if (file) form.append('file', file);

  const result = await request<{ item: MemoryItem }>(existingItem ? `/items/${existingItem._id}` : '/items', {
    method: existingItem ? 'PUT' : 'POST',
    body: form,
  });
  return result.item;
}

export async function removeItem(id: string): Promise<void> {
  await request(`/items/${id}`, { method: 'DELETE' });
}

export async function downloadItemFile(item: MemoryItem): Promise<void> {
  await downloadFile(item.fileUrl, item.fileName);
}

export { jsonBody };
