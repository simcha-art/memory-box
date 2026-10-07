import fs from 'node:fs/promises';
import path from 'node:path';
import Item from '../models/Item.js';
import Reminder from '../models/Reminder.js';
import { ApiError } from '../utils/ApiError.js';

const searchableFields = ['title', 'tags', 'description', 'category'];
const fileDirectory = path.resolve(process.env.UPLOAD_DIR || 'uploads');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listItems(userId, filters) {
  const query = { userId };
  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.tag) query.tags = filters.tag;
  return Item.find(query).sort({ updatedAt: -1 }).limit(200);
}

export async function createItem(userId, input, file) {
  const data = { ...input, userId };
  if (file) Object.assign(data, fileFields(file));
  const item = await Item.create(data);
  item.storageName = data.storageName || '';
  return item;
}

export async function getItem(userId, itemId) {
  const item = await Item.findOne({ _id: itemId, userId }).select('+storageName');
  if (!item) throw new ApiError(404, 'Item not found');
  return item;
}

export async function updateItem(userId, itemId, input, file) {
  const item = await getItem(userId, itemId);
  const oldStorageName = item.storageName;
  Object.assign(item, input);
  if (file) Object.assign(item, fileFields(file));
  await item.save();
  if (file && oldStorageName) await removeStoredFile(oldStorageName);
  return item;
}

export async function deleteItem(userId, itemId) {
  const item = await getItem(userId, itemId);
  await Reminder.deleteMany({ userId, itemId: item._id });
  await item.deleteOne();
  if (item.storageName) await removeStoredFile(item.storageName);
}

export async function searchItems(userId, query) {
  const expression = new RegExp(escapeRegex(query), 'i');
  const items = [];
  const seenIds = new Set();

  for (const field of searchableFields) {
    const remaining = 200 - items.length;
    if (remaining <= 0) break;
    const filter = { userId, [field]: expression };
    if (seenIds.size) filter._id = { $nin: [...seenIds] };
    const matches = await Item.find(filter).sort({ updatedAt: -1, _id: 1 }).limit(remaining);
    for (const item of matches) {
      seenIds.add(item._id.toString());
      items.push(item);
    }
  }
  return items;
}

export async function findRelatedItems(userId, itemId) {
  const item = await getItem(userId, itemId);
  const conditions = [];
  if (item.tags.length) conditions.push({ tags: { $in: item.tags } });
  if (item.category) conditions.push({ category: item.category });
  if (!conditions.length) return [];

  const candidates = await Item.find({ userId, _id: { $ne: item._id }, $or: conditions }).limit(200);
  return candidates.map((candidate) => ({
    item: candidate,
    sharedTags: candidate.tags.filter((tag) => item.tags.includes(tag)).length,
    sharedCategory: Boolean(item.category && item.category === candidate.category),
  })).sort((left, right) => (right.sharedTags - left.sharedTags)
    || (Number(right.sharedCategory) - Number(left.sharedCategory))
    || (right.item.updatedAt - left.item.updatedAt))
    .map(({ item: candidate }) => candidate);
}

export async function getStoredFile(userId, itemId) {
  const item = await getItem(userId, itemId);
  if (!item.storageName) throw new ApiError(404, 'File not found');
  const fullPath = path.resolve(fileDirectory, item.storageName);
  if (!fullPath.startsWith(`${fileDirectory}${path.sep}`)) throw new ApiError(404, 'File not found');
  try {
    await fs.access(fullPath);
  } catch {
    throw new ApiError(404, 'File not found');
  }
  return { fullPath, fileName: item.fileName };
}

function fileFields(file) {
  return {
    fileUrl: '',
    fileName: file.originalname,
    fileSize: file.size,
    storageName: file.filename,
  };
}

async function removeStoredFile(storageName) {
  const fullPath = path.resolve(fileDirectory, storageName);
  if (fullPath.startsWith(`${fileDirectory}${path.sep}`)) {
    await fs.rm(fullPath, { force: true });
  }
}
