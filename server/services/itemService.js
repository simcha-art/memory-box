import fs from 'node:fs/promises';
import path from 'node:path';
import Item from '../models/Item.js';
import Reminder from '../models/Reminder.js';
import { typeAcceptsFileName } from '../config/fileRules.js';
import { ApiError } from '../utils/ApiError.js';
import { decryptSecret, encryptSecret } from '../utils/crypto.js';

const searchableFields = ['title', 'tags', 'description', 'category', 'username'];

const urlTypes = new Set(['Link', 'Password']);
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
  const { password, ...rest } = input;
  const data = { ...rest, userId };
  if (data.type !== 'Password') data.username = '';
  if (data.type === 'Password' && password) Object.assign(data, { passwordEnc: encryptSecret(password), hasPassword: true });
  if (file) Object.assign(data, fileFields(file));
  const item = await Item.create(data);
  item.storageName = data.storageName || '';
  return item;
}

export async function getItem(userId, itemId) {
  const item = await Item.findOne({ _id: itemId, userId }).select('+storageName +passwordEnc');
  if (!item) throw new ApiError(404, 'Item not found');
  return item;
}

export async function updateItem(userId, itemId, input, file) {
  const item = await getItem(userId, itemId);
  const oldStorageName = item.storageName;
  const { password, ...fields } = input;
  Object.assign(item, fields);
  if (file) Object.assign(item, fileFields(file));
  if (!urlTypes.has(item.type)) item.url = '';
  if (item.type === 'Link' && !item.url) throw new ApiError(400, 'A link is required for items of type Link');

  if (item.type === 'Password') {
    if (password) Object.assign(item, { passwordEnc: encryptSecret(password), hasPassword: true });
    if (!item.hasPassword) throw new ApiError(400, 'A password is required for items of type Password');
  } else {
    Object.assign(item, { username: '', passwordEnc: '', hasPassword: false });
  }

  let dropOldFile = Boolean(file && oldStorageName);
  if (!file && item.fileName && !typeAcceptsFileName(item.type, item.fileName)) {
    Object.assign(item, { fileUrl: '', fileName: '', fileSize: 0, storageName: '' });
    dropOldFile = true;
  }
  await item.save();
  if (dropOldFile && oldStorageName) await removeStoredFile(oldStorageName);
  return item;
}

export async function revealPassword(userId, itemId) {
  const item = await getItem(userId, itemId);
  if (item.type !== 'Password' || !item.passwordEnc) throw new ApiError(404, 'No saved password for this item');
  return decryptSecret(item.passwordEnc);
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