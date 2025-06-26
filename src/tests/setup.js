import { pool, createTables} from '../config/database.js';
import {seed} from '../config/seed.js';

global.testUsers = {
    admin: null,
    user: null
}

beforeAll(async () => {
    await new Promise(res => setTimeout(res, 5000));
    await createTables();
});

beforeEach(async () => {
    const client = await pool.connect();
    try {
        await client.query('TRUNCATE TABLE users, products, orders, order_items RESTART IDENTITY CASCADE');
        await seed(true);
        global.testUsers.admin = users.admin;
        global.testUsers.user = users.user;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
});

afterAll(async () => {
    const client = await pool.connect();
    try {
        await client.query('DROP TABLE IF EXISTS order_items, orders, products, users');
        console.log('Tables dropped successfully');
    } catch (error) {
        console.error('Error dropping tables', error.stack);
    } finally {
        client.release();
        await pool.end();
    }
});