import fs from 'node:fs/promises';
import { fileTypeFromFile } from 'file-type';
import { createItem, deleteItem, findRelatedItems, getItem, getStoredFile, listItems, searchItems, updateItem } from '../services/itemService.js';
import { itemListSchema, itemSchema, itemUpdateSchema } from '../validation/schemas.js';
import { contentMatchesMime, describeAllowed, typeAcceptsMime } from '../config/fileRules.js';
import { ApiError } from '../utils/ApiError.js';

async function validateUploadedFile(file, type) {
  if (!file) return;
  if (!typeAcceptsMime(type, file.mimetype)) {
    const allowed = describeAllowed(type);
    throw new ApiError(400, allowed
      ? `Items of type ${type} accept only these files: ${allowed}`
      : `Items of type ${type} cannot have a file attached`);
  }
  const detected = await fileTypeFromFile(file.path);
  if (!contentMatchesMime(detected, file.mimetype)) {
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
    input = parseBody(request.body, itemSchema);
    await validateUploadedFile(request.file, input.type);
    if (input.type !== 'Link') input.url = '';
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
    input = parseBody(request.body, itemUpdateSchema);
    if (request.file) {
      const current = input.type ? null : await getItem(request.userId, request.params.id);
      await validateUploadedFile(request.file, input.type || current.type);
    }
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