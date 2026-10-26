import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authenticate } from './middleware/auth.js'

import authRoutes from './routes/authRoutes.js'
import bookRoutes from './routes/bookRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import deliveryRoutes from './routes/deliveryRoutes.js'
import supportRoutes from './routes/supportRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import buybackRoutes from './routes/buybackRoutes.js'

const app = express()
const PORT = process.env.PORT || 5000

// Middlewares
app.use(cors())
app.use(express.json())

// Request logger
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    const authInfo = req.authType ? `[${req.authType}:${req.user?.role}]` : '[public]'
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms ${authInfo}`)
  })
  next()
})

// Authentication middleware (hỗ trợ cả x-api-key và Bearer Token)
app.use(authenticate)

// Root endpoint: Thông tin API & Hướng dẫn sử dụng API Key
app.get('/', (req, res) => {
  res.json({
    name: 'BookWise Backend REST API',
    version: '1.0.0',
    description: 'Hệ thống Backend phục vụ 3 luồng nghiệp vụ: CSKH + Dashboard + Giao hàng, Mua bán sách & Giao dịch, Theo dõi đơn hàng',
    apiKeySupport: {
      header: 'x-api-key: <KEY>',
      queryParam: '?api_key=<KEY>',
      sampleKeys: {
        admin: 'bw-admin-secret-key-2026',
        logisticsPartner: 'bw-delivery-partner-key-2026',
        publicClient: 'bw-client-api-key-2026',
      },
    },
    businessFlows: {
      flow1_support_dashboard_delivery: {
        support: '/api/support/tickets, /api/support/faqs, /api/support/reviews',
        dashboard: '/api/dashboard/summary, /api/dashboard/revenue-trend, /api/dashboard/top-books, /api/dashboard/live',
        delivery: '/api/delivery/methods, /api/delivery/carriers, /api/delivery/track/:code, /api/delivery/dispatch',
      },
      flow2_books_and_transactions: {
        books: '/api/books, /api/books/:id, /api/books/categories',
        cartAndCheckout: '/api/orders/calculate-cart, /api/orders/apply-coupon, /api/orders/checkout, /api/orders/process-payment',
        buybacks: '/api/buybacks/estimate, /api/buybacks, /api/buybacks/:code',
      },
      flow3_order_tracking: {
        tracking: '/api/orders/track/:code, /api/orders/lookup',
        cancellation: '/api/orders/:code/cancel',
        history: '/api/orders/my-orders',
        statusUpdate: '/api/orders/:code/status',
      },
    },
    health: '/health',
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

// Mount API Routes
app.use('/api/auth', authRoutes)
app.use('/api/books', bookRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/delivery', deliveryRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/buybacks', buybackRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`,
  })
})

// Error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled Server Error:', err)
  res.status(500).json({
    ok: false,
    error: err.message || 'Lỗi máy chủ nội bộ',
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 BookWise Backend Server đang chạy tại: http://localhost:${PORT}`)
  console.log(`📖 Tài liệu & API Specs tại: http://localhost:${PORT}/`)
  console.log(`🔑 Master Admin API Key: ${process.env.ADMIN_API_KEY || 'bw-admin-secret-key-2026'}`)
  console.log(`🚚 Logistics Partner API Key: ${process.env.PARTNER_API_KEY || 'bw-delivery-partner-key-2026'}`)
  console.log(`👤 Public Client API Key: ${process.env.PUBLIC_API_KEY || 'bw-client-api-key-2026'}\n`)
})

export default app
