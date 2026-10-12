import { request } from './client';
import type { Reminder, RepeatType } from '../types';

export async function listReminders(): Promise<Reminder[]> {
  return (await request<{ reminders: Reminder[] }>('/reminders')).reminders;
}

export async function createReminder(itemId: string, title: string, reminderDate: string, timezone: string, repeat: RepeatType = 'none'): Promise<void> {
  await request('/reminders', {
    method: 'POST',
    body: JSON.stringify({ itemId, title, reminderDate: new Date(reminderDate).toISOString(), timezone, repeat }),
  });
}

export async function setReminderCompleted(reminder: Reminder): Promise<void> {
  await request(`/reminders/${reminder._id}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed: !reminder.completed }),
  });
}

export async function deleteReminder(reminderId: string): Promise<void> {
  await request(`/reminders/${reminderId}`, { method: 'DELETE' });
}