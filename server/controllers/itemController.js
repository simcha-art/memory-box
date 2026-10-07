import fs from 'node:fs/promises';
import { fileTypeFromFile } from 'file-type';
import { createItem, deleteItem, findRelatedItems, getItem, getStoredFile, listItems, searchItems, updateItem } from '../services/itemService.js';
import { itemListSchema, itemSchema, itemUpdateSchema } from '../validation/schemas.js';
import { validExtensions } from '../middleware/upload.js';
import { ApiError } from '../utils/ApiError.js';

async function validateUploadedFile(file) {
  if (!file) return;
  const detected = await fileTypeFromFile(file.path);
  if (!detected || detected.mime !== file.mimetype || !validExtensions.get(file.mimetype)?.includes(detected.ext)) {
    throw new ApiError(400, 'The uploaded file content does not match a supported file type');
  }
}

function parseBody(body, schema) {
  const normalized = { ...body };
  if (typeof normalized.tags === 'string') {
    try {
      const parsed = JSON.parse(normalized.tags);
      normalized.tags = Array.isArray(parsed) ? parsed : [normalized.tags];
    } catch {
      normalized.tags = normalized.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    }
  }
  for (const field of ['title', 'description', 'type', 'category', 'date']) {
    if (typeof normalized[field] === 'string') normalized[field] = normalized[field].trim();
  }
  return schema.parse(normalized);
}

function itemResponse(item) {
  const data = item.toObject();
  delete data.storageName;
  if (data.fileName) data.fileUrl = `/items/${item._id}/file`;
  return data;
}

export async function list(request, response) {
  const filters = itemListSchema.parse(request.query);
  const items = await listItems(request.userId, filters);
  response.json({ items: items.map(itemResponse) });
}

export async function create(request, response) {
  let input;
  try {
    await validateUploadedFile(request.file);
    input = parseBody(request.body, itemSchema);
    const item = await createItem(request.userId, input, request.file);
    item.fileUrl = item.fileName ? `/items/${item._id}/file` : '';
    await item.save();
    response.status(201).json({ item: itemResponse(item) });
  } catch (error) {
    if (request.file) await fs.rm(request.file.path, { force: true });
    throw error;
  }
}

export async function get(request, response) {
  response.json({ item: itemResponse(await getItem(request.userId, request.params.id)) });
}

export async function update(request, response) {
  let input;
  try {
    await validateUploadedFile(request.file);
    input = parseBody(request.body, itemUpdateSchema);
    const item = await updateItem(request.userId, request.params.id, input, request.file);
    item.fileUrl = item.fileName ? `/items/${item._id}/file` : '';
    await item.save();
    response.json({ item: itemResponse(item) });
  } catch (error) {
    if (request.file) await fs.rm(request.file.path, { force: true });
    throw error;
  }
}

export async function remove(request, response) {
  await deleteItem(request.userId, request.params.id);
  response.status(204).end();
}

export async function search(request, response) {
  const query = typeof request.query.q === 'string' ? request.query.q.trim() : '';
  if (!query) throw new ApiError(400, 'A non-empty q query parameter is required');
  const items = await searchItems(request.userId, query);
  response.json({ items: items.map(itemResponse) });
}

export async function related(request, response) {
  const items = await findRelatedItems(request.userId, request.params.id);
  response.json({ items: items.map(itemResponse) });
}

export async function download(request, response) {
  const { fullPath, fileName } = await getStoredFile(request.userId, request.params.id);
  response.download(fullPath, fileName);
}
