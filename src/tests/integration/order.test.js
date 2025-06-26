import request from 'supertest';
import app from '../../app';
import { seed } from '../../seeders/seed.js';
import { pool, createTables } from '../../config/database';
import { createOrder, findOrdersByUserId, findAllOrders, findOrderById } from '../../models/orderModel';

describe('Order Model Integration Tests', () => {
    let adminToken;
    let userToken;
    let adminUserId;
    let userUserId;
    let testProducts = [];

    beforeAll(async () => {
        try {
            await createTables();
            const seedResult = await seed(true);

            const adminLogin = await request(app)
                .post('/api/auth/login')
                .send({ email: 'admin@example.com', password: 'admin123' });

            adminToken = adminLogin.body.token;
            adminUserId = seedResult.admin.id;

            const userLogin = await request(app)
                .post('/api/auth/login')
                .send({ email: 'user@example.com', password: 'user123' });

            userToken = userLogin.body.token;
            userUserId = seedResult.user.id;

            const productsRes = await request(app).get('/api/products');
            testProducts = productsRes.body.slice(0, 3);
        } catch (err) {
            console.error('Error in beforeAll:', err);
            throw err;
        }
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('createOrder function', () => {
        it('should create an order with single item', async () => {
            const items = [
                { productId: testProducts[0].id, quantity: 2 }
            ];

            const order = await createOrder(userUserId, items);

            expect(order).toHaveProperty('id');
            expect(order.user_id).toBe(userUserId);
            expect(parseFloat(order.total_price)).toBe(testProducts[0].price * 2);
        });

        it('should create an order with multiple items', async () => {
            const items = [
                { productId: testProducts[0].id, quantity: 1 },
                { productId: testProducts[1].id, quantity: 3 }
            ];

            const expectedTotal = (testProducts[0].price * 1) + (testProducts[1].price * 3);
            const order = await createOrder(userUserId, items);

            expect(order).toHaveProperty('id');
            expect(order.user_id).toBe(userUserId);
            expect(parseFloat(order.total_price)).toBe(expectedTotal);
        });

        it('should throw error for non-existent product', async () => {
            const items = [
                { productId: 99999, quantity: 1 }
            ];

            await expect(createOrder(userUserId, items)).rejects.toThrow('Product with id 99999 not found');
        });

        it('should handle database transaction rollback on error', async () => {
            const items = [
                { productId: testProducts[0].id, quantity: 1 },
                { productId: 99999, quantity: 1 }
            ];

            await expect(createOrder(userUserId, items)).rejects.toThrow();

            const orders = await findOrdersByUserId(userUserId);
            const orderCountBefore = orders.length;

            await expect(createOrder(userUserId, items)).rejects.toThrow();

            const ordersAfter = await findOrdersByUserId(userUserId);
            expect(ordersAfter.length).toBe(orderCountBefore);
        });
    });

    describe('findOrdersByUserId function', () => {
        let testOrderId;

        beforeEach(async () => {
            const items = [{ productId: testProducts[0].id, quantity: 1 }];
            const order = await createOrder(userUserId, items);
            testOrderId = order.id;
        });

        it('should return orders for specific user', async () => {
            const orders = await findOrdersByUserId(userUserId);

            expect(Array.isArray(orders)).toBe(true);
            expect(orders.length).toBeGreaterThan(0);
            expect(orders.every(order => order.user_id === userUserId)).toBe(true);
        });

        it('should return empty array for user with no orders', async () => {
            const newUserRes = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'newuser@test.com',
                    password: 'password123'
                });

            expect(newUserRes.statusCode).toBe(201);
            expect(newUserRes.body).toHaveProperty('_id');

            const newUserId = newUserRes.body._id;

            const orders = await findOrdersByUserId(newUserId);
            expect(Array.isArray(orders)).toBe(true);
            expect(orders.length).toBe(0);
        });

    });

    describe('findAllOrders function', () => {
        beforeEach(async () => {
            const items = [{ productId: testProducts[0].id, quantity: 1 }];
            await createOrder(userUserId, items);
            await createOrder(adminUserId, items);
        });

        it('should return all orders with user emails', async () => {
            const orders = await findAllOrders();

            expect(Array.isArray(orders)).toBe(true);
            expect(orders.length).toBeGreaterThan(0);

            orders.forEach(order => {
                expect(order).toHaveProperty('id');
                expect(order).toHaveProperty('status');
                expect(order).toHaveProperty('created_at');
                expect(order).toHaveProperty('email');
            });

            const emails = orders.map(order => order.email);
            expect(emails).toContain('admin@example.com');
            expect(emails).toContain('user@example.com');
        });
    });

    describe('findOrderById function', () => {
        let testOrderId;

        beforeEach(async () => {
            const items = [
                { productId: testProducts[0].id, quantity: 2 },
                { productId: testProducts[1].id, quantity: 1 }
            ];
            const order = await createOrder(userUserId, items);
            testOrderId = order.id;
        });

        it('should return order details with items and product names', async () => {
            const orderDetails = await findOrderById(testOrderId);

            expect(Array.isArray(orderDetails)).toBe(true);
            expect(orderDetails.length).toBe(2); 

            expect(orderDetails[0]).toHaveProperty('id', testOrderId);
            expect(orderDetails[0]).toHaveProperty('status');
            expect(orderDetails[0]).toHaveProperty('created_at');
            expect(orderDetails[0]).toHaveProperty('email', 'user@example.com');
            expect(orderDetails[0]).toHaveProperty('product_name');
            expect(orderDetails[0]).toHaveProperty('quantity');
            expect(orderDetails[0]).toHaveProperty('price');

            const productNames = orderDetails.map(item => item.product_name);
            expect(productNames).toContain(testProducts[0].name);
            expect(productNames).toContain(testProducts[1].name);

            const quantities = orderDetails.map(item => item.quantity);
            expect(quantities).toContain(2);
            expect(quantities).toContain(1);
        });

        it('should return empty array for non-existent order', async () => {
            const orderDetails = await findOrderById(99999);

            expect(Array.isArray(orderDetails)).toBe(true);
            expect(orderDetails.length).toBe(0);
        });
    });

    describe('Order workflow integration', () => {
        it('should handle complete order lifecycle', async () => {
            const items = [
                { productId: testProducts[0].id, quantity: 1 },
                { productId: testProducts[1].id, quantity: 2 }
            ];

            const order = await createOrder(userUserId, items);
            expect(order).toHaveProperty('id');

            const userOrders = await findOrdersByUserId(userUserId);
            const createdOrder = userOrders.find(o => o.id === order.id);
            expect(createdOrder).toBeDefined();

            const allOrders = await findAllOrders();
            const orderInAll = allOrders.find(o => o.id === order.id);
            expect(orderInAll).toBeDefined();
            expect(orderInAll.email).toBe('user@example.com');

            const orderDetails = await findOrderById(order.id);
            expect(orderDetails.length).toBe(2);
            expect(orderDetails[0].id).toBe(order.id);
        });
    });

    describe('Data integrity and edge cases', () => {
        it('should maintain referential integrity', async () => {
            const items = [{ productId: testProducts[0].id, quantity: 1 }];
            const order = await createOrder(userUserId, items);

            const client = await pool.connect();
            try {
                const orderRes = await client.query('SELECT * FROM orders WHERE id = $1', [order.id]);
                expect(orderRes.rows.length).toBe(1);

                const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
                expect(itemsRes.rows.length).toBe(1);
                expect(itemsRes.rows[0].product_id).toBe(testProducts[0].id);
                expect(itemsRes.rows[0].quantity).toBe(1);
            } finally {
                client.release();
            }
        });

        it('should handle large quantities correctly', async () => {
            const items = [{ productId: testProducts[0].id, quantity: 1000 }];
            const expectedTotal = testProducts[0].price * 1000;

            const order = await createOrder(userUserId, items);
            expect(parseFloat(order.total_price)).toBe(expectedTotal);
        });

        it('should handle decimal prices correctly', async () => {
            
            const items = [{ productId: testProducts[1].id, quantity: 3 }];
            const expectedTotal = testProducts[1].price * 3;

            const order = await createOrder(userUserId, items);
            expect(parseFloat(order.total_price)).toBe(expectedTotal);
        });
    });
});