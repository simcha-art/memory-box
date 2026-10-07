import Category from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';

export async function listCategories(userId) {
  return Category.find({ userId }).sort({ name: 1 });
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
  const category = await Category.findOneAndDelete({ _id: categoryId, userId });
  if (!category) throw new ApiError(404, 'Category not found');
}
