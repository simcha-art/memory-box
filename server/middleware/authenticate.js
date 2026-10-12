import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export async function authenticate(request, _response, next) {
  const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return next(new ApiError(401, 'Authentication required'));
  }

  let payload;
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }

    payload = jwt.verify(token, secret);
    if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
      throw new Error('Invalid token payload');
    }
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'));
  }

  const user = await User.findById(payload.sub).select('role disabled passwordChangedAt').catch(() => null);
  if (!user || user.disabled) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }

  if (user.passwordChangedAt && typeof payload.iat === 'number'
    && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }

  request.userId = payload.sub;
  request.userEmail = payload.email;
  request.userRole = user.role;
  return next();
}

export function requireAdmin(request, _response, next) {
  if (request.userRole !== 'admin') {
    return next(new ApiError(403, 'Administrator access required'));
  }
  return next();
}