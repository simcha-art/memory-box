import type { Reminder } from '../types';

export function getReminderItemId(reminder: Reminder): string {
  return typeof reminder.itemId === 'string' ? reminder.itemId : reminder.itemId?._id || '';
}
