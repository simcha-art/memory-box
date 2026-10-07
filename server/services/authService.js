import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

function issueToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return jwt.sign({}, secret, { subject: userId.toString(), expiresIn: '7d' });
}

function presentUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

export async function registerUser(input) {
  const password = await bcrypt.hash(input.password, 12);
  try {
    const user = await User.create({ ...input, password });
    return { user: presentUser(user), token: issueToken(user._id) };
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'An account with this email already exists');
    }
    throw error;
  }
}

export async function loginUser(input) {
  const user = await User.findOne({ email: input.email }).select('+password');
  if (!user || !(await bcrypt.compare(input.password, user.password))) {
    throw new ApiError(401, 'Email or password is incorrect');
  }
  return { user: presentUser(user), token: issueToken(user._id) };
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, 'Account no longer exists');
  }
  return presentUser(user);
}
