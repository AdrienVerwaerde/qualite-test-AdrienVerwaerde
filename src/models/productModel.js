import { pool } from '../config/database.js';

export const createProduct = async (name, description, price, stock) => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, price, stock]
    );
    return res.rows[0];
  } finally {
    client.release();
  }
};

export const findAllProducts = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM products');
    return res.rows;
  } finally {
    client.release();
  }
};

export const findProductById = async (id) => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM products WHERE id = $1', [id]);
    return res.rows[0];
  } finally {
    client.release();
  }
};

export const updateProductById = async (id, name, description, price, stock) => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'UPDATE products SET name = $1, description = $2, price = $3, stock = $4 WHERE id = $5 RETURNING *',
      [name, description, price, stock, id]
    );
    return res.rows[0];
  } finally {
    client.release();
  }
};

export const deleteProductById = async (id) => {
  const client = await pool.connect();
  try {
    const res = await client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    return res.rows[0];
  } finally {
    client.release();
  }
};
