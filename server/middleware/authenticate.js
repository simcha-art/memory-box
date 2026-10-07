import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';

export function authenticate(request, _response, next) {
  const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }

    const payload = jwt.verify(token, secret);
    if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
      throw new Error('Invalid token payload');
    }
    request.userId = payload.sub;
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}
