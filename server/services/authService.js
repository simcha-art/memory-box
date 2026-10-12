import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

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

export async function registerUser(input) {
  const password = await bcrypt.hash(input.password, 12);
  try {
    const created = await User.create({ ...input, password });
    const user = await syncAdminRole(created);
    return { user: presentUser(user), token: issueToken(user._id, user.email) };
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'An account with this email already exists');
    }
    throw error;
  }
}

export async function loginUser(input) {
  const found = await User.findOne({ email: input.email }).select('+password');
  if (!found || !(await bcrypt.compare(input.password, found.password))) {
    throw new ApiError(401, 'Email or password is incorrect');
  }
  if (found.disabled) {
    throw new ApiError(403, 'This account has been disabled');
  }
  const user = await syncAdminRole(found);
  return { user: presentUser(user), token: issueToken(user._id, user.email) };
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, 'Account no longer exists');
  }
  return presentUser(await syncAdminRole(user));
}