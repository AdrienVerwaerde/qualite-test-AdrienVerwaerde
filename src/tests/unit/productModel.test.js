import { createProduct, findAllProducts, findProductById, updateProductById, deleteProductById } from '../../models/productModel.js';
import { pool, createTables } from '../../config/database.js';

describe('Product Model', () => {
  let createdProduct;

  beforeAll(async () => {
    await createTables();
  });

    afterAll(async () => {
    await pool.end();
  });

  it('should create a new product', async () => {
    const name = 'Test Product';
    const description = 'A product for testing';
    const price = 9.99;
    const stock = 100;

    const product = await createProduct(name, description, price, stock);
    expect(product).toHaveProperty('id');
    expect(product.name).toBe(name);
    createdProduct = product;
  });

  it('should find all products', async () => {
    const products = await findAllProducts();
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
  });

  it('should find a product by ID', async () => {
    const product = await findProductById(createdProduct.id);
    expect(product).toBeDefined();
    expect(product.id).toBe(createdProduct.id);
  });

  it('should update a product by ID', async () => {
    const updated = await updateProductById(
      createdProduct.id,
      'Updated Name',
      'Updated Description',
      19.99,
      200
    );
    expect(updated.name).toBe('Updated Name');
    expect(parseFloat(updated.price)).toBe(19.99);
  });

  it('should delete a product by ID', async () => {
    const deleted = await deleteProductById(createdProduct.id);
    expect(deleted.id).toBe(createdProduct.id);

    const shouldBeNull = await findProductById(createdProduct.id);
    expect(shouldBeNull).toBeUndefined();
  });
});