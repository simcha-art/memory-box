import fs from 'node:fs/promises';
import path from 'node:path';
import Category from '../models/Category.js';
import Item from '../models/Item.js';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const fileDirectory = path.resolve(process.env.UPLOAD_DIR || 'uploads');

function presentAdminUser(user, itemCount) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    disabled: Boolean(user.disabled),
    emailVerified: user.emailVerified !== false,
    itemCount: itemCount || 0,
    createdAt: user.createdAt,
  };
}

async function getUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

async function assertNotLastActiveAdmin(user) {
  if (user.role !== 'admin') return;
  const otherAdmins = await User.countDocuments({ _id: { $ne: user._id }, role: 'admin', disabled: { $ne: true } });
  if (!otherAdmins) throw new ApiError(400, 'At least one active administrator is required');
}

export async function listUsers() {
  const [users, counts] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(1000),
    Item.aggregate([{ $group: { _id: '$userId', count: { $sum: 1 } } }]),
  ]);
  const countByUser = new Map(counts.map((entry) => [entry._id.toString(), entry.count]));
  return users.map((user) => presentAdminUser(user, countByUser.get(user._id.toString())));
}

export async function updateUser(actingUserId, userId, changes) {
  const user = await getUser(userId);
  const isSelf = user._id.toString() === actingUserId;
  const losesAdmin = changes.role === 'user' && user.role === 'admin';
  const getsBlocked = changes.disabled === true;

  if (isSelf && (losesAdmin || getsBlocked)) {
    throw new ApiError(400, 'You cannot demote or block your own account');
  }
  if (losesAdmin || (getsBlocked && user.role === 'admin')) {
    await assertNotLastActiveAdmin(user);
  }

  if (changes.role !== undefined) user.role = changes.role;
  if (changes.disabled !== undefined) user.disabled = changes.disabled;
  await user.save();
  const itemCount = await Item.countDocuments({ userId: user._id });
  return presentAdminUser(user, itemCount);
}

export async function deleteUser(actingUserId, userId) {
  const user = await getUser(userId);
  if (user._id.toString() === actingUserId) {
    throw new ApiError(400, 'You cannot delete your own account');
  }
  await assertNotLastActiveAdmin(user);

  const items = await Item.find({ userId: user._id }).select('+storageName');
  await Promise.all(items.filter((item) => item.storageName).map(async (item) => {
    const fullPath = path.resolve(fileDirectory, item.storageName);
    if (fullPath.startsWith(`${fileDirectory}${path.sep}`)) await fs.rm(fullPath, { force: true });
  }));

  await Promise.all([
    Reminder.deleteMany({ userId: user._id }),
    Item.deleteMany({ userId: user._id }),
    Category.deleteMany({ userId: user._id }),
  ]);
  await user.deleteOne();
}