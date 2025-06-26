import { createUser, findUserByEmail, findUserById, deleteUser, updateUser, loginUser } from '../../models/userModel.js';
import { pool, createTables } from '../../config/database.js';
import bcrypt from 'bcryptjs';
import { jest } from '@jest/globals';

describe('User Model', () => {
    let userMock;

    const originalConnect = pool.connect;

    beforeAll(() => {
      pool.connect = jest.fn();
    });

    beforeEach(() => {
      jest.clearAllMocks();
      userMock = {
          query: jest.fn(),
          release: jest.fn()
      }
      pool.connect.mockResolvedValue(userMock);
    });

    afterAll(() => {
      pool.connect = originalConnect;
    });

    describe('createUser', () => {
      it('should create a new user with hashed password', async () => {
        jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword123'); 
        userMock.query.mockResolvedValue({
        rows: [{
            id: 1,
            email: 'test@test.com',
            is_admin: false,
            created_at: new Date(),
          }]
        });
        const user = await createUser('test@test.com', 'password123', false);

        expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);

        expect(userMock.query).toHaveBeenCalledWith(
          'INSERT INTO users (email, password, is_admin) VALUES ($1, $2, $3) RETURNING id, email, is_admin, created_at',
          ['test@test.com', 'hashedPassword123', false]
        );

        expect(userMock.release).toHaveBeenCalled();

        expect(user).toEqual({
          id: 1,
          email: 'test@test.com',
          is_admin: false,
          created_at: expect.any(Date),
          role: 'user'
        });
      })
    })

    describe('finduserByEmail', () => {
      it('should find a user by email', async () => {
        userMock.query.mockResolvedValue({
          rows: [{
            id: 1,
            email: 'test@test.com', 
            password: 'hashedPassword123',
            is_admin: false,
            created_at: new Date(),
          }],
        });

        const user = await findUserByEmail('test@test.com');
        expect(userMock.query).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE email = $1',
          ['test@test.com']
        );
        expect(userMock.release).toHaveBeenCalled();
        expect(user).toMatchObject({
            id: 1,
            email: 'test@test.com', 
            password: 'hashedPassword123',
            is_admin: false,
            role: 'user'
        });
      });
    });

    describe('findUserById', () => {
     it('should find a user by ID', async () => {
      userMock.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@test.com',
          is_admin: false
        }]
      });
      const user = await findUserById(1);
    
      expect(userMock.query).toHaveBeenCalledWith(
        'SELECT id, email, is_admin FROM users WHERE id = $1',
        [1]
      );
      expect(userMock.release).toHaveBeenCalled();
      expect(user).toEqual({
        id: 1,
        email: 'test@test.com',
        is_admin: false,
        role: 'user'
      });
    });
    });

    describe('deleteUser', () => {
      it('should delete a user and return deleted user info', async () => {
        userMock.query.mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'delete@test.com',
            is_admin: false
          }]
        });

        const user = await deleteUser(1);

        expect(userMock.query).toHaveBeenCalledWith(
          'DELETE FROM users WHERE id = $1 RETURNING id, email, is_admin',
          [1]
        );
        expect(userMock.release).toHaveBeenCalled();
        expect(user).toEqual({
          id: 1,
          email: 'delete@test.com',
          is_admin: false,
          role: 'user'
        });
      });
    });

  describe('updateUser', () => {
    it('should update email and/or password and return updated user', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('newHashedPassword');

      userMock.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'updated@test.com',
          is_admin: false
        }]
      });

      const user = await updateUser(1, 'updated@test.com', 'newpassword123');

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(userMock.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET'),
        expect.arrayContaining(['updated@test.com', 'newHashedPassword', 1])
      );
      expect(userMock.release).toHaveBeenCalled();
      expect(user).toEqual({
        id: 1,
        email: 'updated@test.com',
        is_admin: false,
        role: 'user'
      });
    });

    it('should return null if nothing to update', async () => {
      const user = await updateUser(1);
      expect(user).toBeNull();
      expect(userMock.query).not.toHaveBeenCalled();
      expect(userMock.release).toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    it('should authenticate user with correct credentials', async () => {
      userMock.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'login@test.com',
          password: 'hashedPassword123',
          is_admin: false
        }]
      });

      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const user = await loginUser('login@test.com', 'password123');

      expect(userMock.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['login@test.com']
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(userMock.release).toHaveBeenCalled();
      expect(user).toEqual({
        id: 1,
        email: 'login@test.com',
        is_admin: false,
        role: 'user'
      });
    });

    it('should return null if user not found', async () => {
      userMock.query.mockResolvedValueOnce({ rows: [] });

      const user = await loginUser('nonexistent@test.com', 'password');
      expect(user).toBeNull();
      expect(userMock.release).toHaveBeenCalled();
    });

    it('should return null if password is incorrect', async () => {
      userMock.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'login@test.com',
          password: 'hashedPassword123',
          is_admin: false
        }]
      });

      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const user = await loginUser('login@test.com', 'wrongpassword');
      expect(user).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalled();
      expect(userMock.release).toHaveBeenCalled();
    });
  });
});
