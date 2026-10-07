import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { connectDatabase } from './config/database.js';

let mongo;

async function register(name, email) {
  const response = await request(app).post('/api/auth/register').send({
    name,
    email,
    password: 'correct-horse-42',
  });
  expect(response.status).toBe(201);
  return response.body;
}

async function addItem(token, input) {
  const response = await request(app)
    .post('/api/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'Note', title: 'Saved note', ...input });
  expect(response.status).toBe(201);
  return response.body.item;
}

function asUser(token) {
  const withToken = (test) => test.set('Authorization', `Bearer ${token}`);
  return {
    get: (path) => withToken(request(app).get(path)),
    post: (path) => withToken(request(app).post(path)),
    patch: (path) => withToken(request(app).patch(path)),
    delete: (path) => withToken(request(app).delete(path)),
  };
}

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-only-secret-with-enough-entropy';
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('MemoryBox API', () => {
  it('checks health and validates registration input', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' });
    await request(app).post('/api/auth/register').send({
      name: 'Ada', email: 'not-an-email', password: 'short',
    }).expect(400);
  });

  it('rejects file bodies that do not match an allowed upload MIME type', async () => {
    const account = await register('Upload', `upload-${Date.now()}@example.com`);
    const response = await asUser(account.token)
      .post('/api/items')
      .field('title', 'Fake image')
      .field('type', 'Image')
      .attach('file', Buffer.from('not a png'), { filename: 'fake.png', contentType: 'image/png' });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/content does not match/i);
  });

  it('requires a verified bearer token for user data', async () => {
    await request(app).get('/api/items').expect(401);
    await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid').expect(401);
  });

  it('keeps item reads, changes, and deletes isolated by user', async () => {
    const owner = await register('Owner', `owner-${Date.now()}@example.com`);
    const stranger = await register('Stranger', `stranger-${Date.now()}@example.com`);
    const item = await addItem(owner.token, { title: 'Private record' });

    await asUser(stranger.token).get(`/api/items/${item._id}`).expect(404);
    await asUser(stranger.token).patch(`/api/items/${item._id}`).send({ title: 'Stolen' }).expect(404);
    await asUser(stranger.token).delete(`/api/items/${item._id}`).expect(404);
    await asUser(owner.token).get(`/api/items/${item._id}`).expect(200);
  });

  it('ranks search matches by title, tags, description, then category', async () => {
    const account = await register('Search', `search-${Date.now()}@example.com`);
    const token = account.token;
    await addItem(token, { title: 'Ordinary note', category: 'needle' });
    await addItem(token, { title: 'Ordinary note', description: 'needle in the details' });
    await addItem(token, { title: 'Ordinary note', tags: ['needle'] });
    await addItem(token, { title: 'needle in title' });

    const response = await asUser(token).get('/api/items/search?q=needle').expect(200);
    expect(response.body.items.map((item) => item.title)).toEqual([
      'needle in title', 'Ordinary note', 'Ordinary note', 'Ordinary note',
    ]);
    expect(response.body.items[1].tags).toContain('needle');
    expect(response.body.items[2].description).toContain('needle');
    expect(response.body.items[3].category).toBe('needle');
  });

  it('returns related items and upcoming reminders only within the owner account', async () => {
    const owner = await register('Owner', `related-${Date.now()}@example.com`);
    const other = await register('Other', `other-${Date.now()}@example.com`);
    const source = await addItem(owner.token, { title: 'Appliance warranty', category: 'Home', tags: ['washer'] });
    const sameTag = await addItem(owner.token, { title: 'Washer manual', tags: ['washer'] });
    await addItem(other.token, { title: 'Other washer', tags: ['washer'] });

    const related = await asUser(owner.token).get(`/api/items/${source._id}/related`).expect(200);
    expect(related.body.items.map((item) => item._id)).toContain(sameTag._id);
    expect(related.body.items).toHaveLength(1);

    await asUser(other.token).post('/api/reminders').send({
      itemId: source._id,
      title: 'Not yours',
      reminderDate: new Date(Date.now() + 86_400_000).toISOString(),
    }).expect(404);

    const soon = new Date(Date.now() + 86_400_000);
    const later = new Date(Date.now() + 172_800_000);
    await asUser(owner.token).post('/api/reminders').send({ itemId: source._id, title: 'Later', reminderDate: later.toISOString() }).expect(201);
    await asUser(owner.token).post('/api/reminders').send({ itemId: source._id, title: 'Soon', reminderDate: soon.toISOString() }).expect(201);
    const upcoming = await asUser(owner.token).get('/api/reminders/upcoming').expect(200);
    expect(upcoming.body.reminders.map((reminder) => reminder.title)).toEqual(['Soon', 'Later']);
    const soonReminder = upcoming.body.reminders[0];
    await asUser(owner.token).get(`/api/reminders/${soonReminder._id}`).expect(200);
    await asUser(owner.token).patch(`/api/reminders/${soonReminder._id}`).send({ completed: true }).expect(200);
    const afterCompletion = await asUser(owner.token).get('/api/reminders/upcoming').expect(200);
    expect(afterCompletion.body.reminders.map((reminder) => reminder.title)).toEqual(['Later']);
    await asUser(owner.token).delete(`/api/reminders/${soonReminder._id}`).expect(204);

    const categoryResponse = await asUser(owner.token).post('/api/categories').send({ name: 'Travel' }).expect(201);
    await asUser(owner.token).get(`/api/categories/${categoryResponse.body.category._id}`).expect(200);
    await asUser(other.token).get(`/api/categories/${categoryResponse.body.category._id}`).expect(404);
  });

  it('removes an item’s reminders with the item', async () => {
    const account = await register('Cleanup', `cleanup-${Date.now()}@example.com`);
    const item = await addItem(account.token, { title: 'Old appliance' });
    const reminder = await asUser(account.token).post('/api/reminders').send({
      itemId: item._id,
      title: 'Check warranty',
      reminderDate: new Date(Date.now() + 86_400_000).toISOString(),
    }).expect(201);

    await asUser(account.token).delete(`/api/items/${item._id}`).expect(204);
    await asUser(account.token).get(`/api/reminders/${reminder.body.reminder._id}`).expect(404);
  });
});
