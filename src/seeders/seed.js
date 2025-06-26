import { pool, createTables } from '../config/database.js';
import { createUser } from '../models/userModel.js';
import { createProduct } from '../models/productModel.js';

export const seed = async (skipDelay = false) => {
  try {
    // Skip the delay if called from tests
    if (!skipDelay) {
      console.log('Waiting for DB to be ready...');
      await new Promise(res => setTimeout(res, 5000));
    }

    // Only create tables if not called from tests (tables are created in setup.js)
    if (!skipDelay) {
      console.log('Creating tables...');
      await createTables();
    }

    console.log('Seeding database...');

    // Clear existing data for tests
    if (skipDelay) {
      await clearTestData();
    }

    // Create users (email, password, isAdmin)
    const admin = await createUser('admin@example.com', 'admin123', true);
    const user = await createUser('user@example.com', 'user123', false);
    console.log('Users created');

    // Create products
    await createProduct('Laptop', 'A powerful laptop for all your computing needs', 1200.00, 10);
    await createProduct('Wireless Mouse', 'A high-precision wireless mouse', 25.00, 50);
    await createProduct('Mechanical Keyboard', 'A tactile mechanical keyboard with RGB lighting', 75.00, 30);
    await createProduct('Monitor', '27-inch 4K display with HDR', 350.00, 15);
    await createProduct('Headphones', 'Noise-cancelling wireless headphones', 125.00, 40);
    await createProduct('Smartphone', 'Latest model with advanced features', 999.00, 20);
    console.log('Products created');

    console.log('Database seeded successfully');
    return { admin, user };
  } catch (err) {
    console.error('Error seeding database:', err.stack);
    throw err; // Re-throw to allow proper error handling
  }
};

// Function to clear test data
const clearTestData = async () => {
  const client = await pool.connect();
  try {
    // Delete in order of dependencies
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM users');
    console.log('Test data cleared');
  } catch (err) {
    console.error('Error clearing test data:', err);
    // Don't throw here, let the seeding continue
  } finally {
    client.release();
  }
};

// Only run seed automatically if this script is executed directly
if (process.argv[1].includes('seed.js')) {
  seed().finally(() => pool.end());
}