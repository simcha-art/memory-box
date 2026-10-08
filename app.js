"Set up a basic Express server for me that routes to 'users' and 'items'. It needs CORS to communicate with the React app and should run on port 3000. type module"
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import authRoutes from './server/routes/authRoutes.js';
import categoryRoutes from './server/routes/categoryRoutes.js';
import itemRoutes from './server/routes/itemRoutes.js';
import reminderRoutes from './server/routes/reminderRoutes.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

console.log('Allowed CORS origins:', allowedOrigins);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/categories', categoryRoutes);

app.use((request, _response, next) => {
  const error = new Error(`Route not found: ${request.method} ${request.path}`);
  error.status = 404;
  next(error);
});

app.use((error, _request, response, _next) => {
    console.error('Error:', error);
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
  return response.status(status).json({ error: status >= 500 ? 'Internal server error' : error.message });
});

export default app;
