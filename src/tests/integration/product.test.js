import request from 'supertest';
import app from '../../app';
import { seed } from '../../seeders/seed.js';
import { pool, createTables } from '../../config/database';

describe('Product routes', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    try {
        await createTables();
        await seed(true);

        const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'admin123' });

        adminToken = login.body.token;

        const loginUser = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'user123' });

        userToken = loginUser.body.token;
    } catch (err) {
        console.error('Error in beforeAll:', err);
        throw err;
    }
    });

  afterAll(async () => {
    await pool.end();
  });

  it('should allow admin to create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Product',
        description: 'Test description',
        price: 99.99,
        stock: 100
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Test Product');
  });

  it('should forbid user from creating a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Another Product',
        description: 'Desc',
        price: 50,
        stock: 20
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Not authorized as an admin');
  });

  it('should allow anyone to list products', async () => {
    const res = await request(app)
      .get('/api/products');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should allow anyone to get a product by id', async () => {
    const listRes = await request(app).get('/api/products');
    const productId = listRes.body[0].id;

    const res = await request(app)
      .get(`/api/products/${productId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', productId);
  });

  it('should allow admin to update a product', async () => {
    const listRes = await request(app).get('/api/products');
    const productId = listRes.body[0].id;

    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated Product',
        description: 'Updated description',
        price: 150.00,
        stock: 5
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Updated Product');
  });

  it('should forbid user to update a product', async () => {
    const listRes = await request(app).get('/api/products');
    const productId = listRes.body[0].id;

    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Try Update',
        description: 'Fail update',
        price: 1,
        stock: 1
      });

    expect(res.statusCode).toBe(403);
  });

  it('should allow admin to delete a product', async () => {
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Product To Delete',
        description: 'Delete me',
        price: 10,
        stock: 1
      });

    const productId = createRes.body.id;

    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Product removed');
  });

  it('should forbid user to delete a product', async () => {
    const listRes = await request(app).get('/api/products');
    const productId = listRes.body[0].id;

    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
  });
});