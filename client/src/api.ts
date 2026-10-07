export type ItemType = 'Document' | 'Receipt' | 'Note' | 'Link' | 'Image';

export type MemoryItem = {
  _id: string;
  title: string;
  description: string;
  type: ItemType;
  category: string;
  tags: string[];
  fileUrl: string;
  fileName: string;
  fileSize: number;
  date: string;
  updatedAt: string;
};

export type Reminder = {
  _id: string;
  itemId: { _id: string; title: string; type: ItemType } | string;
  title: string;
  reminderDate: string;
  completed: boolean;
};

export type MemoryUser = { id: string; name: string; email: string };

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem('memorybox-token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error || 'Something went wrong', response.status);
  return payload as T;
}

export async function downloadFile(path: string, fileName: string) {
  const token = localStorage.getItem('memorybox-token');
  const response = await fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ApiError(payload.error || 'Could not download this file', response.status);
  }
  const blobUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}
