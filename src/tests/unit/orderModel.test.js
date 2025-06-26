import { createOrder, findOrdersByUserId, findAllOrders, findOrderById } from '../../models/orderModel.js';
import { pool } from '../../config/database.js';

describe('Order Model', () => {
  let userId;
  let product1;
  let product2;

  beforeAll(async () => {
    const client = await pool.connect();

    const userRes = await client.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id",
      ['testuser@example.com', 'hashedpassword']
    );
    userId = userRes.rows[0].id;

    const prodRes1 = await client.query(
      "INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING id, price",
      ['Product 1', 10, 100]
    );
    product1 = prodRes1.rows[0];

    const prodRes2 = await client.query(
      "INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING id, price",
      ['Product 2', 20, 50]
    );
    product2 = prodRes2.rows[0];

    client.release();
  });

  afterAll(async () => {
    const client = await pool.connect();

    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM users');

    client.release();
    await pool.end();
  });

  test('createOrder crée une commande avec les items et calcule le total', async () => {
    const items = [
      { productId: product1.id, quantity: 2 },
      { productId: product2.id, quantity: 1 },
    ];

    const order = await createOrder(userId, items);

    expect(order).toBeDefined();
    expect(order.user_id).toBe(userId);
    expect(Number(order.total_price)).toBe(40);

    const client = await pool.connect();
    const res = await client.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    client.release();

    expect(res.rows.length).toBe(2);
    expect(res.rows.find(i => i.product_id === product1.id).quantity).toBe(2);
    expect(res.rows.find(i => i.product_id === product2.id).quantity).toBe(1);
  });

  test('findOrdersByUserId retourne les commandes pour un utilisateur', async () => {
    const orders = await findOrdersByUserId(userId);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0].user_id).toBe(userId);
  });

  test('findAllOrders retourne toutes les commandes avec infos utilisateur', async () => {
    const orders = await findAllOrders();
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0]).toHaveProperty('email');
    expect(orders[0]).toHaveProperty('id');
  });

  test('findOrderById retourne une commande détaillée avec items', async () => {
    const orders = await findOrdersByUserId(userId);
    const orderId = orders[0].id;

    const orderDetails = await findOrderById(orderId);
    expect(orderDetails.length).toBeGreaterThan(0);

    const item = orderDetails[0];
    expect(item).toHaveProperty('product_name');
    expect(item).toHaveProperty('quantity');
    expect(item).toHaveProperty('price');
  });
});