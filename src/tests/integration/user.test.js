import request from 'supertest';
import app from '../../app';
import { createTables, pool } from '../../config/database';

describe('User routes', () => {
    const uniqueEmail = `test` + Date.now() + '@test.com';
    const password = 'password123';

    beforeAll(async () => {
        await createTables();
    });
    
    afterAll(async () => {
        await pool.end();
    });

    it('should register a new user', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: uniqueEmail,
                password: password
            });

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('_id');
        expect(response.body).toHaveProperty('token');
        expect(response.body.email).toBe(uniqueEmail);
        expect(response.body.role).toBe('user');
    })
});