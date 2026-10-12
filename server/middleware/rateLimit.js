import { rateLimit } from 'express-rate-limit';

function createLimiter({ windowMs, limit, message, ...options }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    handler: (_request, response) => response.status(429).json({ error: message }),
    ...options,
  });
}

export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  message: 'Too many attempts. Please try again in a few minutes.',
});

export const emailLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: 'Too many email requests. Please try again later.',
});

export const secretLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: (request) => String(request.userId),
  message: 'Too many password reveals. Please try again later.',
});