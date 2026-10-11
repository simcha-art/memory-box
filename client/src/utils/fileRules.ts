import type { ItemType } from '../types';

type Format = { label: string; extensions: string[]; mimes: string[] };

const formats: Record<string, Format> = {
  pdf: { label: 'PDF', extensions: ['pdf'], mimes: ['application/pdf'] },
  word: { label: 'Word', extensions: ['doc', 'docx'], mimes: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  jpeg: { label: 'JPG', extensions: ['jpg', 'jpeg'], mimes: ['image/jpeg'] },
  png: { label: 'PNG', extensions: ['png'], mimes: ['image/png'] },
  webp: { label: 'WEBP', extensions: ['webp'], mimes: ['image/webp'] },
};

const allowedByType: Record<ItemType, string[]> = {
  Document: ['pdf', 'word'],
  Receipt: ['pdf', 'jpeg', 'png', 'webp'],
  Image: ['jpeg', 'png', 'webp'],
  Note: [],
  Link: [],
  Password: [],
};

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type TypeInputKind = 'file' | 'link' | 'password' | 'none';

export function inputKindFor(type: ItemType): TypeInputKind {
  if (type === 'Link') return 'link';
  if (type === 'Password') return 'password';
  return allowedByType[type].length ? 'file' : 'none';
}

export function acceptFor(type: ItemType): string {
  return allowedByType[type].flatMap((key) => [...formats[key].extensions.map((ext) => `.${ext}`), ...formats[key].mimes]).join(',');
}

export function formatLabelFor(type: ItemType): string {
  return allowedByType[type].map((key) => formats[key].label).join(', ');
}

export function fileNameAllowed(type: ItemType, fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return allowedByType[type].some((key) => formats[key].extensions.includes(extension));
}

export function fileAllowed(type: ItemType, file: File): boolean {
  return fileNameAllowed(type, file.name);
}