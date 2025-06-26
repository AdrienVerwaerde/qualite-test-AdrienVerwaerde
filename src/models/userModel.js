import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const createUser = async (email, password, isAdmin = false) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  try {
    const res = await client.query(
      'INSERT INTO users (email, password, is_admin) VALUES ($1, $2, $3) RETURNING id, email, is_admin, created_at',
      [email, hashedPassword, isAdmin]
    );
    const user = res.rows[0];
    if (user) {
      user.role = user.is_admin ? 'admin' : 'user';
    }
    return user;
  } finally {
    client.release();
  }
};

export const findUserByEmail = async (email) => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = res.rows[0];
    if (user) {
      // Convert is_admin to role for consistency with existing code
      user.role = user.is_admin ? 'admin' : 'user';
    }
    return user;
  } finally {
    client.release();
  }
};

export const findUserById = async (id) => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, email, is_admin FROM users WHERE id = $1', [id]);
    const user = res.rows[0];
    if (user) {
      // Convert is_admin to role for consistency with existing code
      user.role = user.is_admin ? 'admin' : 'user';
    }
    return user;
  } finally {
    client.release();
  }
};

export const deleteUser = async (id) => {
  const client = await pool.connect();
  try {
    const res = await client.query('DELETE FROM users WHERE id = $1 RETURNING id, email, is_admin', [id]);
    const user = res.rows[0];
    if (user) {
      user.role = user.is_admin ? 'admin' : 'user';
    }
    return user;
  } finally {
    client.release();
  }
};

export const updateUser = async (id, newEmail, newPassword) => {
  const client = await pool.connect();
  try {
    let query = 'UPDATE users SET';
    const updates = [];
    const values = [];

    if (newEmail) {
      updates.push(' email = $' + (values.length + 1));
      values.push(newEmail);
    }

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.push(' password = $' + (values.length + 1));
      values.push(hashedPassword);
    }

    if (updates.length === 0) return null;

    query += updates.join(',');
    query += ' WHERE id = $' + (values.length + 1) + ' RETURNING id, email, is_admin';
    values.push(id);

    const res = await client.query(query, values);
    const user = res.rows[0];
    if (user) {
      user.role = user.is_admin ? 'admin' : 'user';
    }
    return user;
  } finally {
    client.release();
  }
};

export const loginUser = async (email, password) => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = res.rows[0];
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    delete user.password;
    user.role = user.is_admin ? 'admin' : 'user';
    return user;
  } finally {
    client.release();
  }
};