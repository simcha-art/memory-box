import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { startReminderScheduler } from './services/reminderEmail.js';

const port = Number(process.env.PORT) || 3000;

try {
  await connectDatabase();
  app.listen(port, () => {
    console.log(`MemoryBox API listening on port ${port}`);
    startReminderScheduler();
  });
} catch (error) {
  console.error('Could not start MemoryBox API:', error.message);
  process.exitCode = 1;
}
