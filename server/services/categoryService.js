import Category from '../models/Category.js';
import Item from '../models/Item.js';
import { DEFAULT_CATEGORIES, LEGACY_DEFAULT_NAMES } from '../config/defaultCategories.js';
import { ApiError } from '../utils/ApiError.js';

async function ensureDefaultCategories(userId) {
  const stored = await Category.find({ userId, isDefault: true }).select('name');
  const names = stored.map((category) => category.name);
  const stale = names.filter((name) => !DEFAULT_CATEGORIES.includes(name));
  if (!stale.length && DEFAULT_CATEGORIES.every((name) => names.includes(name))) return;

  for (const oldName of stale) {
    const key = LEGACY_DEFAULT_NAMES[oldName];
    if (key) await Item.updateMany({ userId, category: oldName }, { category: key });
  }
  if (stale.length) await Category.deleteMany({ userId, isDefault: true, name: { $in: stale } });

  try {
    await Category.bulkWrite(DEFAULT_CATEGORIES.map((name, index) => ({
      updateOne: {
        filter: { userId, name },
        update: { $set: { isDefault: true, order: index } },
        upsert: true,
      },
    })));
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }
}

export async function listCategories(userId) {
  await ensureDefaultCategories(userId);
  return Category.find({ userId }).sort({ isDefault: -1, order: 1, name: 1 });
}

export async function getCategory(userId, categoryId) {
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) throw new ApiError(404, 'Category not found');
  return category;
}

export async function createCategory(userId, name) {
  try {
    return await Category.create({ userId, name });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'This category already exists');
    throw error;
  }
}

export async function updateCategory(userId, categoryId, name) {
  const current = await getCategory(userId, categoryId);
  if (current.isDefault) throw new ApiError(403, 'Fixed categories cannot be renamed');
  try {
    const category = await Category.findOneAndUpdate(
      { _id: categoryId, userId },
      { name },
      { new: true, runValidators: true },
    );
    if (!category) throw new ApiError(404, 'Category not found');
    return category;
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'This category already exists');
    throw error;
  }
}

export async function deleteCategory(userId, categoryId) {
  const current = await getCategory(userId, categoryId);
  if (current.isDefault) throw new ApiError(403, 'Fixed categories cannot be deleted');
  await Category.findOneAndDelete({ _id: categoryId, userId });
}