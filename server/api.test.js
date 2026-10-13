import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import Reminder from './models/Reminder.js';
import User from './models/User.js';
import { getRemindersBeforeNow } from './services/reminderService.js';
import { sendVerificationEmail } from './services/verificationEmail.js';

vi.mock('./services/verificationEmail.js', () => ({
  sendVerificationEmail: vi.fn(),
}));

let mongo;

async function register(name, email) {
  const password = 'correct-horse-42';
  const response = await request(app).post('/api/auth/register').send({
    name,
    email,
    password,
  });
  expect(response.status).toBe(201);
  expect(response.body.token).toBeUndefined();

  await User.updateOne({ email }, { emailVerified: true });
  const login = await request(app).post('/api/auth/login').send({ email, password });
  expect(login.status).toBe(200);
  return login.body;
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
  if (mongo) await mongo.stop();
});

describe('MemoryBox API', () => {
  it('checks health and validates registration input', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' });
    await request(app).post('/api/auth/register').send({
      name: 'Ada', email: 'not-an-email', password: 'short',
    }).expect(400);
  });

  it('requires email verification before the first sign-in', async () => {
    const email = `verify-${Date.now()}@example.com`;
    const password = 'correct-horse-42';

    const created = await request(app).post('/api/auth/register')
      .send({ name: 'Vera', email, password }).expect(201);
    expect(created.body.requiresVerification).toBe(true);
    expect(created.body.token).toBeUndefined();

    const blocked = await request(app).post('/api/auth/login').send({ email, password }).expect(403);
    expect(blocked.body.code).toBe('EMAIL_NOT_VERIFIED');

    const { token } = sendVerificationEmail.mock.calls.at(-1)[0];
    expect(token).toBeTruthy();

    const callsBeforeResend = sendVerificationEmail.mock.calls.length;
    await request(app).post('/api/auth/resend-verification').send({ email }).expect(200);
    expect(sendVerificationEmail.mock.calls.length).toBe(callsBeforeResend);

    await request(app).post('/api/auth/verify-email').send({ token: 'wrong-token' }).expect(400);
    const verified = await request(app).post('/api/auth/verify-email').send({ token }).expect(200);
    expect(verified.body.token).toBeTruthy();
    expect(verified.body.user.email).toBe(email);

    await request(app).post('/api/auth/verify-email').send({ token }).expect(400);
    await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  });

  it('does not reveal whether an account exists when resending verification', async () => {
    await request(app).post('/api/auth/resend-verification')
      .send({ email: `nobody-${Date.now()}@example.com` }).expect(200);
  });

  it('shows email verification status in the admin user list', async () => {
    const suffix = Date.now();
    const adminEmail = `admin-${suffix}@example.com`;
    const admin = await register('Admin', adminEmail);
    await User.updateOne({ email: adminEmail }, { role: 'admin' });

    const unverifiedEmail = `pending-${suffix}@example.com`;
    await request(app).post('/api/auth/register').send({
      name: 'Pending', email: unverifiedEmail, password: 'correct-horse-42',
    }).expect(201);

    const { body } = await asUser(admin.token).get('/api/admin/users').expect(200);
    expect(body.users.find((user) => user.email === adminEmail).emailVerified).toBe(true);
    expect(body.users.find((user) => user.email === unverifiedEmail).emailVerified).toBe(false);
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

  it('stores saved passwords encrypted and reveals them only to the owner', async () => {
    const owner = await register('Vault', `vault-${Date.now()}@example.com`);
    const other = await register('Other', `other-${Date.now()}@example.com`);

    const created = await asUser(owner.token).post('/api/items').send({
      type: 'Password', title: 'Bank', username: 'ada', password: 'S3cret!pass', url: 'https://bank.example.com',
    });
    expect(created.status).toBe(201);
    expect(created.body.item.type).toBe('Password');
    expect(created.body.item.username).toBe('ada');
    expect(created.body.item.hasPassword).toBe(true);
    expect(created.body.item.passwordEnc).toBeUndefined();
    expect(JSON.stringify(created.body)).not.toContain('S3cret!pass');

    const id = created.body.item._id;
    const list = await asUser(owner.token).get('/api/items');
    expect(JSON.stringify(list.body)).not.toContain('S3cret!pass');

    const revealed = await asUser(owner.token).get(`/api/items/${id}/secret`);
    expect(revealed.status).toBe(200);
    expect(revealed.body.password).toBe('S3cret!pass');
    expect(revealed.headers['cache-control']).toMatch(/no-store/);

    await asUser(other.token).get(`/api/items/${id}/secret`).expect(404);
  });

  it('requires a password for Password items and clears it when the type changes', async () => {
    const account = await register('Switch', `switch-${Date.now()}@example.com`);
    const api = asUser(account.token);

    await api.post('/api/items').send({ type: 'Password', title: 'No pass', username: 'x' }).expect(400);

    const created = await api.post('/api/items').send({ type: 'Password', title: 'Site', password: 'abc12345' });
    expect(created.status).toBe(201);
    const id = created.body.item._id;

    const changed = await api.patch(`/api/items/${id}`).send({ type: 'Note' });
    expect(changed.status).toBe(200);
    expect(changed.body.item.hasPassword).toBe(false);
    expect(changed.body.item.username).toBe('');
    await api.get(`/api/items/${id}/secret`).expect(404);
  });

  it('adapts accepted input to the item type', async () => {
    const account = await register('Types', `types-${Date.now()}@example.com`);
    const api = asUser(account.token);

    await api.post('/api/items').send({ type: 'Link', title: 'No url' }).expect(400);
    await api.post('/api/items').send({ type: 'Link', title: 'Bad url', url: 'javascript:alert(1)' }).expect(400);
    const link = await api.post('/api/items').send({ type: 'Link', title: 'Docs', url: 'https://example.com/a' }).expect(201);
    expect(link.body.item.url).toBe('https://example.com/a');

    const note = await api.post('/api/items').send({ type: 'Note', title: 'N', url: 'https://example.com' }).expect(201);
    expect(note.body.item.url).toBe('');

    const wrongForDocument = await api.post('/api/items')
      .field('title', 'Pic as doc').field('type', 'Document')
      .attach('file', Buffer.from('x'), { filename: 'a.png', contentType: 'image/png' });
    expect(wrongForDocument.status).toBe(400);
    expect(wrongForDocument.body.error).toMatch(/accept only/i);

    const wrongForImage = await api.post('/api/items')
      .field('title', 'Word as image').field('type', 'Image')
      .attach('file', Buffer.from('x'), { filename: 'a.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    expect(wrongForImage.status).toBe(400);

    const fileOnLink = await api.post('/api/items')
      .field('title', 'File on link').field('type', 'Link').field('url', 'https://example.com')
      .attach('file', Buffer.from('x'), { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(fileOnLink.status).toBe(400);
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

  it('searches for items with every comma-separated tag, ignoring case and spaces', async () => {
    const account = await register('Tag Search', `tag-search-${Date.now()}@example.com`);
    const matchingItem = await addItem(account.token, {
      title: 'Travel papers', tags: ['Warrenty', 'Computer'],
    });
    await addItem(account.token, { title: 'Warranty only', tags: ['Warrenty'] });
    await addItem(account.token, { title: 'Computer only', tags: ['Computer'] });

    const response = await asUser(account.token)
      .get('/api/items/search?q=%20warrenty%20%2C%20computer%20').expect(200);
    expect(response.body.items.map((item) => item._id)).toEqual([matchingItem._id]);
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

  it('stores reminder timezones and selects only overdue incomplete unsent reminders', async () => {
    const account = await register('Notifications', `notifications-${Date.now()}@example.com`);
    const api = asUser(account.token);
    const item = await addItem(account.token);
    const reminderDate = new Date(Date.now() - 60_000).toISOString();

    const due = await api.post('/api/reminders').send({
      itemId: item._id,
      title: 'Due reminder',
      reminderDate,
      timezone: 'America/New_York',
    }).expect(201);
    expect(due.body.reminder.timezone).toBe('America/New_York');

    const completed = await api.post('/api/reminders').send({
      itemId: item._id,
      title: 'Completed reminder',
      reminderDate,
    }).expect(201);
    expect(completed.body.reminder.timezone).toBe('UTC');
    await api.patch(`/api/reminders/${completed.body.reminder._id}`).send({ completed: true }).expect(200);
    const sent = await api.post('/api/reminders').send({
      itemId: item._id,
      title: 'Already sent',
      reminderDate,
    }).expect(201);
    await Reminder.updateOne({ _id: sent.body.reminder._id }, { isSent: true });

    const dueIds = (await getRemindersBeforeNow()).map((reminder) => String(reminder._id));
    expect(dueIds).toContain(due.body.reminder._id);
    expect(dueIds).not.toContain(completed.body.reminder._id);
    expect(dueIds).not.toContain(sent.body.reminder._id);

    await Reminder.updateOne({ _id: due.body.reminder._id }, { isSent: true });
    const rescheduled = await api.patch(`/api/reminders/${due.body.reminder._id}`).send({
      reminderDate: new Date(Date.now() + 86_400_000).toISOString(),
    }).expect(200);
    expect(rescheduled.body.reminder.isSent).toBe(false);

    await api.post('/api/reminders').send({
      itemId: item._id,
      title: 'Invalid timezone',
      reminderDate,
      timezone: 'Mars/Olympus',
    }).expect(400);
  });
});