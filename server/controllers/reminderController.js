import { createReminder, deleteReminder, getReminder, listReminders, listUpcomingReminders, updateReminder } from '../services/reminderService.js';
import { reminderSchema, reminderUpdateSchema } from '../validation/schemas.js';

export async function list(request, response) {
  response.json({ reminders: await listReminders(request.userId) });
}

export async function upcoming(request, response) {
  response.json({ reminders: await listUpcomingReminders(request.userId) });
}

export async function get(request, response) {
  response.json({ reminder: await getReminder(request.userId, request.params.id) });
}

export async function create(request, response) {
  const input = reminderSchema.parse(request.body);
  response.status(201).json({ reminder: await createReminder(request.userId, input) });
}

export async function update(request, response) {
  const input = reminderUpdateSchema.parse(request.body);
  response.json({ reminder: await updateReminder(request.userId, request.params.id, input) });
}

export async function remove(request, response) {
  await deleteReminder(request.userId, request.params.id);
  response.status(204).end();
}
