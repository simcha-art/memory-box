import type { Reminder } from '../types';

export function getReminderItemId(reminder: Reminder): string {
  return typeof reminder.itemId === 'string' ? reminder.itemId : reminder.itemId?._id || '';
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}