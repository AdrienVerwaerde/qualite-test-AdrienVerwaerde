import app from './app.js';
import { createTables } from './config/database.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  // Wait for the database to be ready
  await new Promise(resolve => setTimeout(resolve, 5000));
  await createTables();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
