import { request } from './client';
import type { Reminder } from '../types';

export async function listReminders(): Promise<Reminder[]> {
  return (await request<{ reminders: Reminder[] }>('/reminders')).reminders;
}

export async function createReminder(itemId: string, title: string, reminderDate: string): Promise<void> {
  await request('/reminders', {
    method: 'POST',
    body: JSON.stringify({ itemId, title, reminderDate: new Date(reminderDate).toISOString() }),
  });
}

export async function setReminderCompleted(reminder: Reminder): Promise<void> {
  await request(`/reminders/${reminder._id}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed: !reminder.completed }),
  });
}
