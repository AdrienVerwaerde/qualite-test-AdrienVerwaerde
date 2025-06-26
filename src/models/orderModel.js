import { pool } from '../config/database.js';

export const createOrder = async (userId, items) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const productPrices = {};

    for (const item of items) {
      const productRes = await client.query('SELECT price FROM products WHERE id = $1', [item.productId]);
      const price = productRes.rows[0]?.price;
      if (!price) {
        throw new Error(`Product with id ${item.productId} not found`);
      }
      total += price * item.quantity;
      productPrices[item.productId] = price;
    }

    const orderRes = await client.query(
      'INSERT INTO orders (user_id, total_price) VALUES ($1, $2) RETURNING *',
      [userId, total]
    );
    const newOrder = orderRes.rows[0];

    const orderItemsPromises = items.map(item => {
      return client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [newOrder.id, item.productId, item.quantity, productPrices[item.productId]]
      );
    });

    await Promise.all(orderItemsPromises);

    await client.query('COMMIT');
    return newOrder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const findOrdersByUserId = async (userId) => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM orders WHERE user_id = $1', [userId]);
    return res.rows;
  } finally {
    client.release();
  }
};

export const findAllOrders = async () => {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT o.id, o.status, o.created_at, u.email
            FROM orders o
            JOIN users u ON o.user_id = u.id
        `);
        return res.rows;
    } finally {
        client.release();
    }
};

export const findOrderById = async (id) => {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT o.id, o.status, o.created_at, u.email, p.name as product_name, oi.quantity, oi.price
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.id = $1
        `, [id]);
        return res.rows;
    } finally {
        client.release();
    }
};
