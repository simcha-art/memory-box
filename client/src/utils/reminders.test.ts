import { describe, expect, it } from 'vitest';
import type { Reminder } from '../types';
import { getReminderItemId, isSameDay } from './reminders';

describe('reminder utilities', () => {
  it('gets item IDs from string and populated reminder references', () => {
    const base: Omit<Reminder, 'itemId'> = {
      _id: 'reminder-1',
      title: 'Reminder',
      reminderDate: new Date().toISOString(),
      completed: false,
    };
    expect(getReminderItemId({ ...base, itemId: 'item-1' })).toBe('item-1');
    expect(getReminderItemId({
      ...base,
      itemId: { _id: 'item-2', title: 'Item', type: 'Note' },
    })).toBe('item-2');
  });

  it('compares calendar dates without considering the time', () => {
    expect(isSameDay(new Date(2026, 9, 13, 0), new Date(2026, 9, 13, 23, 59))).toBe(true);
    expect(isSameDay(new Date(2026, 9, 13), new Date(2026, 9, 14))).toBe(false);
    expect(isSameDay(new Date(2026, 8, 13), new Date(2026, 9, 13))).toBe(false);
  });
});
