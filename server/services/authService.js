import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { sendVerificationEmail } from './verificationEmail.js';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function issueToken(userId, userEmail) {
  "the token should contain the userId and email in the payload, and should be signed with a secret key"
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return jwt.sign({ sub: userId.toString(), email: userEmail }, secret, { expiresIn: '7d' });
}

function presentUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role || 'user' };
}

function adminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function syncAdminRole(user) {
  if (user.role !== 'admin' && adminEmails().includes(user.email)) {
    user.role = 'admin';
    await user.save();
  }
  return user;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createVerificationToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    hash: hashToken(token),
    expires: new Date(Date.now() + VERIFICATION_TTL_MS),
  };
}

async function deliverVerificationEmail(user, token) {
  try {
    await sendVerificationEmail({ name: user.name, email: user.email, token });
  } catch (error) {
    // The account already exists; the user can request another email via "resend".
    console.error(`Could not send verification email to ${user.email}:`, error);
  }
}

export async function registerUser(input) {
  const password = await bcrypt.hash(input.password, 12);
  const verification = createVerificationToken();
  let created;
  try {
    created = await User.create({
      ...input,
      password,
      emailVerified: false,
      verificationTokenHash: verification.hash,
      verificationExpires: verification.expires,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'An account with this email already exists');
    }
    throw error;
  }

  const user = await syncAdminRole(created);
  await deliverVerificationEmail(user, verification.token);
  return { user: presentUser(user), requiresVerification: true };
}

export async function loginUser(input) {
  const found = await User.findOne({ email: input.email }).select('+password');
  if (!found || !(await bcrypt.compare(input.password, found.password))) {
    throw new ApiError(401, 'Email or password is incorrect');
  }
  if (found.disabled) {
    throw new ApiError(403, 'This account has been disabled');
  }
  if (found.emailVerified === false) {
    throw new ApiError(403, 'Please verify your email address before signing in', 'EMAIL_NOT_VERIFIED');
  }
  const user = await syncAdminRole(found);
  return { user: presentUser(user), token: issueToken(user._id, user.email) };
}

export async function verifyEmailToken(token) {
  const user = await User.findOne({
    verificationTokenHash: hashToken(token),
    verificationExpires: { $gt: new Date() },
  }).select('+verificationTokenHash +verificationExpires');

  if (!user) {
    throw new ApiError(400, 'This verification link is invalid or has expired');
  }

  user.emailVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationExpires = undefined;
  await user.save();

  if (user.disabled) {
    throw new ApiError(403, 'This account has been disabled');
  }
  const verified = await syncAdminRole(user);
  return { user: presentUser(verified), token: issueToken(verified._id, verified.email) };
}

export async function resendVerificationEmail(email) {
  const user = await User.findOne({ email }).select('+verificationExpires');
  if (!user || user.disabled || user.emailVerified !== false) return;

  const lastSentAt = user.verificationExpires
    ? user.verificationExpires.getTime() - VERIFICATION_TTL_MS
    : 0;
  if (Date.now() - lastSentAt < RESEND_COOLDOWN_MS) return;

  const verification = createVerificationToken();
  user.verificationTokenHash = verification.hash;
  user.verificationExpires = verification.expires;
  await user.save();
  await deliverVerificationEmail(user, verification.token);
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, 'Account no longer exists');
  }
  return presentUser(await syncAdminRole(user));
}