import { describe, expect, it, vi } from 'vitest';
import { deleteUser, listUsers, updateUser } from './admin';
import { createCategory, deleteCategory, listCategories } from './categories';
import { downloadFile, jsonBody, request } from './client';
import {
  downloadItemFile,
  getRelatedItems,
  listItems,
  removeItem,
  revealItemPassword,
  saveItem,
  searchItems,
} from './items';
import {
  createReminder,
  deleteReminder,
  listReminders,
  setReminderCompleted,
} from './reminders';
import type { ItemInput, MemoryItem, Reminder } from '../types';

vi.mock('./client', () => ({
  downloadFile: vi.fn(),
  jsonBody: vi.fn((value: unknown) => JSON.stringify(value)),
  request: vi.fn(),
}));

const requestMock = vi.mocked(request);
const downloadMock = vi.mocked(downloadFile);

describe('API endpoint helpers', () => {
  it('unwraps admin and category responses and sends updates', async () => {
    requestMock.mockResolvedValueOnce({ users: [{ id: 'u1' }] });
    expect(await listUsers()).toEqual([{ id: 'u1' }]);

    requestMock.mockResolvedValueOnce({ user: { id: 'u1' } });
    expect(await updateUser('u1', { role: 'admin' })).toEqual({ id: 'u1' });
    expect(requestMock).toHaveBeenLastCalledWith('/admin/users/u1', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'admin' }),
    });
    requestMock.mockResolvedValueOnce(undefined);
    await deleteUser('u1');
    expect(requestMock).toHaveBeenLastCalledWith('/admin/users/u1', { method: 'DELETE' });

    requestMock.mockResolvedValueOnce({ categories: [{ _id: 'c1', name: 'Home' }] });
    expect(await listCategories()).toEqual([{ _id: 'c1', name: 'Home' }]);
    requestMock.mockResolvedValueOnce({ category: { _id: 'c2', name: 'Travel' } });
    expect(await createCategory('Travel')).toEqual({ _id: 'c2', name: 'Travel' });
    requestMock.mockResolvedValueOnce(undefined);
    await deleteCategory('c2');
    expect(requestMock).toHaveBeenLastCalledWith('/categories/c2', { method: 'DELETE' });
  });

  it('serializes item reads, searches, writes, secrets, and file downloads', async () => {
    const item: MemoryItem = {
      _id: 'i1',
      title: 'Receipt',
      description: 'Household receipt',
      type: 'Receipt',
      category: 'Home',
      url: '',
      username: '',
      hasPassword: false,
      tags: ['home', 'annual'],
      fileUrl: '/items/i1/file',
      fileName: 'receipt.pdf',
      fileSize: 100,
      date: '2026-10-13',
      updatedAt: '2026-10-13T10:00:00.000Z',
    };
    const input: ItemInput = {
      title: 'Receipt',
      description: '',
      type: 'Receipt',
      category: 'Home',
      url: '',
      tags: ['home'],
      date: '2026-10-13',
    };
    requestMock.mockResolvedValueOnce({ items: [item] });
    expect(await listItems()).toEqual([item]);
    requestMock.mockResolvedValueOnce({ items: [item] });
    expect(await searchItems('annual bill')).toEqual([item]);
    expect(requestMock).toHaveBeenLastCalledWith('/items/search?q=annual%20bill');
    requestMock.mockResolvedValueOnce({ items: [item] });
    expect(await getRelatedItems('i1')).toEqual([item]);

    requestMock.mockResolvedValueOnce({ item });
    expect(await saveItem(input, undefined)).toEqual(item);
    const [createPath, createOptions] = requestMock.mock.calls.at(-1)!;
    expect(createPath).toBe('/items');
    expect(createOptions?.method).toBe('POST');
    expect(createOptions?.body).toBeInstanceOf(FormData);

    const updatedItem = { ...item, title: 'Updated receipt' };
    requestMock.mockResolvedValueOnce({ item: updatedItem });
    expect(await saveItem(
      { ...input, title: 'Updated receipt', tags: [] },
      new File(['receipt'], 'receipt.pdf'),
      item,
    )).toEqual(updatedItem);
    expect(requestMock.mock.calls.at(-1)?.slice(0, 2)).toEqual([
      '/items/i1',
      expect.objectContaining({ method: 'PUT' }),
    ]);

    requestMock.mockResolvedValueOnce({ password: 'secret' });
    expect(await revealItemPassword('i1')).toBe('secret');
    requestMock.mockResolvedValueOnce(undefined);
    await removeItem('i1');
    expect(requestMock).toHaveBeenLastCalledWith('/items/i1', { method: 'DELETE' });
    await downloadItemFile(item);
    expect(downloadMock).toHaveBeenCalledWith('/items/i1/file', 'receipt.pdf');
    expect(jsonBody({ ok: true })).toBe('{"ok":true}');
  });

  it('normalizes reminder dates and toggles the completion state', async () => {
    const reminder = {
      _id: 'r1',
      itemId: 'i1',
      title: 'Renew',
      reminderDate: '2026-10-13T10:00:00.000Z',
      completed: false,
    } satisfies Reminder;
    requestMock.mockResolvedValueOnce({ reminders: [reminder] });
    expect(await listReminders()).toEqual([reminder]);

    requestMock.mockResolvedValueOnce(undefined);
    await createReminder('i1', 'Renew', '2026-10-13T10:00:00Z', 'UTC');
    expect(requestMock).toHaveBeenLastCalledWith('/reminders', {
      method: 'POST',
      body: JSON.stringify({
        itemId: 'i1',
        title: 'Renew',
        reminderDate: '2026-10-13T10:00:00.000Z',
        timezone: 'UTC',
        repeat: 'none',
      }),
    });

    requestMock.mockResolvedValueOnce(undefined);
    await setReminderCompleted(reminder);
    expect(requestMock).toHaveBeenLastCalledWith('/reminders/r1', {
      method: 'PATCH',
      body: JSON.stringify({ completed: true }),
    });
    requestMock.mockResolvedValueOnce(undefined);
    await deleteReminder('r1');
    expect(requestMock).toHaveBeenLastCalledWith('/reminders/r1', { method: 'DELETE' });
  });
});
