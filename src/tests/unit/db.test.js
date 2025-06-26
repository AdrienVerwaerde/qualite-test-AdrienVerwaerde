import {pool} from '../../config/database.js';

describe('Database Connection', () => {
    it('should connect to the database', async () => {
        expect(pool).toBeDefined();
        expect(pool.connect).toBeInstanceOf(Function);
        
        const client = await pool.connect();
        expect(client).toBeDefined();
        client.release();
    });
    
    afterAll(async () => {
        await pool.end();
    });
});

// docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
