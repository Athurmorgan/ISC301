import { Router } from 'express'
import {
  applyCoupon,
  calculateCart,
  cancelOrder,
  getAllOrders,
  getMyOrders,
  lookupOrders,
  placeOrder,
  processPayment,
  trackOrder,
  updateOrderStatus,
} from '../controllers/orderController.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'

const router = Router()

// Flow 2: Cart & Checkout Transactions
router.post('/calculate-cart', calculateCart)
router.post('/apply-coupon', applyCoupon)
router.post('/checkout', placeOrder)
router.post('/process-payment', processPayment)

// Flow 3: Order Tracking & Management
router.get('/track/:code', trackOrder)
router.post('/lookup', lookupOrders)
router.post('/:code/cancel', cancelOrder)
router.get('/my-orders', requireAuth, getMyOrders)

// Admin / API Key Management
router.get('/', requireAdmin, getAllOrders)
router.patch('/:code/status', requireAdmin, updateOrderStatus)

export default router
