import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import User from './models/User.js';
import { sendPasswordResetEmail } from './services/passwordResetEmail.js';

vi.mock('./services/verificationEmail.js', () => ({
  sendVerificationEmail: vi.fn(),
}));
vi.mock('./services/passwordResetEmail.js', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

let mongo;

async function registerVerified(name, email, password) {
  await request(app).post('/api/auth/register').send({ name, email, password }).expect(201);
  await User.updateOne({ email }, { emailVerified: true });
  const login = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return login.body;
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

describe('security headers', () => {
  it('sets hardening headers and hides the framework', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('password reset', () => {
  it('does not reveal whether an account exists', async () => {
    const callsBefore = sendPasswordResetEmail.mock.calls.length;
    const response = await request(app).post('/api/auth/forgot-password')
      .send({ email: `nobody-${Date.now()}@example.com` }).expect(200);
    expect(response.body.message).toBeTruthy();
    expect(sendPasswordResetEmail.mock.calls.length).toBe(callsBefore);
  });

  it('resets the password once, rejects reuse, and invalidates older sessions', async () => {
    const email = `reset-${Date.now()}@example.com`;
    const oldPassword = 'correct-horse-42';
    const newPassword = 'brand-new-pass-77';
    const account = await registerVerified('Reset', email, oldPassword);

    await request(app).post('/api/auth/forgot-password').send({ email }).expect(200);
    const { token } = sendPasswordResetEmail.mock.calls.at(-1)[0];
    expect(token).toBeTruthy();

    const callsAfterFirst = sendPasswordResetEmail.mock.calls.length;
    await request(app).post('/api/auth/forgot-password').send({ email }).expect(200);
    expect(sendPasswordResetEmail.mock.calls.length).toBe(callsAfterFirst);

    await request(app).post('/api/auth/reset-password')
      .send({ token: 'wrong-token', password: newPassword }).expect(400);
    await request(app).post('/api/auth/reset-password')
      .send({ token, password: 'short' }).expect(400);

    await request(app).post('/api/auth/reset-password')
      .send({ token, password: newPassword }).expect(200);

    await request(app).post('/api/auth/reset-password')
      .send({ token, password: 'another-pass-123' }).expect(400);

    await request(app).post('/api/auth/login').send({ email, password: oldPassword }).expect(401);
    const relogin = await request(app).post('/api/auth/login').send({ email, password: newPassword }).expect(200);
    await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${relogin.body.token}`).expect(200);

    const staleToken = jwt.sign(
      { sub: account.user.id, email, iat: Math.floor(Date.now() / 1000) - 3600 },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );
    await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${staleToken}`).expect(401);
  });
});