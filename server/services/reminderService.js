import Item from '../models/Item.js';
import Reminder from '../models/Reminder.js';
import { ApiError } from '../utils/ApiError.js';

async function ensureOwnedItem(userId, itemId) {
  const item = await Item.exists({ _id: itemId, userId });
  if (!item) throw new ApiError(404, 'Item not found');
}

export async function listReminders(userId) {
  return Reminder.find({ userId }).populate('itemId', 'title type').sort({ reminderDate: 1 });
}

export async function listUpcomingReminders(userId) {
  return Reminder.find({ userId, completed: false, reminderDate: { $gte: new Date() } })
    .populate('itemId', 'title type')
    .sort({ reminderDate: 1 });
}

export async function getReminder(userId, reminderId) {
  const reminder = await Reminder.findOne({ _id: reminderId, userId }).populate('itemId', 'title type');
  if (!reminder) throw new ApiError(404, 'Reminder not found');
  return reminder;
}

export async function createReminder(userId, input) {
  await ensureOwnedItem(userId, input.itemId);
  return Reminder.create({ ...input, userId });
}

export async function updateReminder(userId, reminderId, input) {
  if (input.itemId) await ensureOwnedItem(userId, input.itemId);
  const reminder = await Reminder.findOneAndUpdate(
    { _id: reminderId, userId },
    input,
    { new: true, runValidators: true },
  ).populate('itemId', 'title type');
  if (!reminder) throw new ApiError(404, 'Reminder not found');
  return reminder;
}

export async function deleteReminder(userId, reminderId) {
  const reminder = await Reminder.findOneAndDelete({ _id: reminderId, userId });
  if (!reminder) throw new ApiError(404, 'Reminder not found');
}
