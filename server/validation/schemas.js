import { z } from 'zod';

const itemTypes = ['Document', 'Receipt', 'Note', 'Link', 'Image'];

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
});

const linkUrl = z.string().trim().max(2048).refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'Enter a valid link starting with http:// or https://');

const itemBaseSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(10000).optional(),
  type: z.enum(itemTypes),
  url: linkUrl.or(z.literal('')).optional(),
  category: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  date: z.coerce.date().optional(),
});

export const itemSchema = itemBaseSchema.refine((value) => value.type !== 'Link' || Boolean(value.url), {
  message: 'A link is required for items of type Link',
  path: ['url'],
});

export const itemUpdateSchema = itemBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one item field is required',
});

export const itemListSchema = z.object({
  type: z.enum(itemTypes).optional(),
  category: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(40).optional(),
});

export const reminderSchema = z.object({
  itemId: z.string().regex(/^[a-f\d]{24}$/i),
  title: z.string().trim().min(1).max(160),
  reminderDate: z.coerce.date(),
  completed: z.boolean().optional(),
});

export const reminderUpdateSchema = reminderSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one reminder field is required',
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
});