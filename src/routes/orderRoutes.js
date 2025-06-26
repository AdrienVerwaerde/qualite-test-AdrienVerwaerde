import express from 'express';
import { addOrder, getOrders, getOrderById } from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, addOrder).get(protect, admin, getOrders);
router.route('/:id').get(protect, getOrderById);

export default router;
