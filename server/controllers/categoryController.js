import { categorySchema } from '../validation/schemas.js';
import { createCategory, deleteCategory, getCategory, listCategories, updateCategory } from '../services/categoryService.js';

export async function list(request, response) {
  response.json({ categories: await listCategories(request.userId) });
}

export async function get(request, response) {
  response.json({ category: await getCategory(request.userId, request.params.id) });
}

export async function create(request, response) {
  const { name } = categorySchema.parse(request.body);
  response.status(201).json({ category: await createCategory(request.userId, name) });
}

export async function update(request, response) {
  const { name } = categorySchema.parse(request.body);
  response.json({ category: await updateCategory(request.userId, request.params.id, name) });
}

export async function remove(request, response) {
  await deleteCategory(request.userId, request.params.id);
  response.status(204).end();
}
