import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import { ApiError } from './utils/ApiError.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

if (process.env.TRUST_PROXY) {
  const value = process.env.TRUST_PROXY.trim();
  app.set('trust proxy', /^\d+$/.test(value) ? Number(value) : value);
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/categories', categoryRoutes);

app.use((request, _response, next) => {
  const error = new Error(`Route not found: ${request.method} ${request.path}`);
  error.status = 404;
  next(error);
});

app.use((error, _request, response, _next) => {
  if (error.name === 'ZodError') {
    return response.status(400).json({ error: 'Validation failed', details: error.issues });
  }
  if (error.name === 'CastError') {
    return response.status(400).json({ error: 'Invalid identifier' });
  }
  if (error.name === 'MulterError') {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'File must be 10 MB or smaller'
      : 'Invalid upload';
    return response.status(400).json({ error: message });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  const body = { error: status >= 500 ? 'Internal server error' : error.message };
  if (error instanceof ApiError && error.code) body.code = error.code;
  return response.status(status).json(body);
});

export default app;