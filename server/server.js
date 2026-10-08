import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';

const port = Number(process.env.PORT) || 3000;

try {
  await connectDatabase();
  app.listen(port, () => {
    console.log(`MemoryBox API listening on port ${port}`);
  });
} catch (error) {
  console.error('Could not start MemoryBox API:', error.message);
  process.exitCode = 1;
}
