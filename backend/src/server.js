import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { queryOne } from './db.js'
import { authenticate } from './middleware/auth.js'

import authRoutes from './routes/authRoutes.js'
import bookRoutes from './routes/bookRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import deliveryRoutes from './routes/deliveryRoutes.js'
import supportRoutes from './routes/supportRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import buybackRoutes from './routes/buybackRoutes.js'
import sellerRoutes from './routes/sellerRoutes.js'
import listingRoutes from './routes/listingRoutes.js'

// Lần chạy đầu (database trống) tự nạp dữ liệu mẫu để front-end có sách ngay
if (!queryOne('SELECT 1 AS found FROM books LIMIT 1')) {
  const { seed } = await import('./seed.js')
  seed({ exportJson: false })
} else if (!queryOne('SELECT 1 AS found FROM listings LIMIT 1')) {
  // Database có từ trước khi có sàn người bán: tạo tin đăng từ tồn kho hiện tại
  const { seedMarketplace } = await import('./seed.js')
  seedMarketplace()
}

const app = express()

// Middlewares
app.disable('x-powered-by')
app.use(cors(config.corsOrigins.length ? { origin: config.corsOrigins } : undefined))
app.use(express.json({ limit: '2mb' }))

// Request logger
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    const authInfo = req.authType ? `[${req.authType}:${req.user?.role}]` : '[public]'
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms ${authInfo}`)
  })
  next()
})

// Authentication middleware (hỗ trợ cả x-api-key và Bearer Token)
app.use(authenticate)

// Root endpoint: Thông tin API
app.get('/', (req, res) => {
  res.json({
    name: 'BookWise Backend REST API',
    version: '1.0.0',
    description: 'Hệ thống Backend phục vụ 3 luồng nghiệp vụ: CSKH + Dashboard + Giao hàng, Mua bán sách & Giao dịch, Theo dõi đơn hàng',
    authentication: {
      apiKey: 'Header x-api-key: <KEY> (cấu hình trong backend/.env)',
      bearer: 'Header Authorization: Bearer <JWT> (lấy từ POST /api/auth/login)',
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
        sellers: '/api/sellers/apply, /api/sellers/me, /api/sellers, /api/sellers/:email/status',
        listings: '/api/listings, /api/listings/mine, /api/listings/payouts, /api/listings/:id, /api/listings/:id/status',
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
app.use('/api/sellers', sellerRoutes)
app.use('/api/listings', listingRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: `Không tìm thấy endpoint: ${req.method} ${req.path}`,
  })
})

// Error handler: JSON sai cú pháp là lỗi của client; lỗi khác không lộ chi tiết nội bộ khi chạy production
app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'Body JSON không hợp lệ' })
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: 'Dữ liệu gửi lên quá lớn' })
  }
  console.error('Unhandled Server Error:', err)
  res.status(500).json({
    ok: false,
    error: config.isProduction ? 'Lỗi máy chủ nội bộ' : err.message || 'Lỗi máy chủ nội bộ',
  })
})

// Start server
app.listen(config.port, () => {
  const enabledKeys = Object.entries(config.apiKeys)
    .filter(([, v]) => v)
    .map(([k]) => k)
  console.log(`\n🚀 BookWise Backend Server đang chạy tại: http://localhost:${config.port}`)
  console.log(`📖 Tài liệu & API Specs tại: http://localhost:${config.port}/`)
  console.log(`🔑 API key đang bật: ${enabledKeys.length ? enabledKeys.join(', ') : 'không có (chỉ dùng JWT)'}\n`)
})

export default app
