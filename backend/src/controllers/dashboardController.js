import { queryAll, queryOne } from '../db.js'

/**
 * Thống kê tổng quan (Dashboard KPI Summary)
 */
export function getSummary(req, res) {
  try {
    // 1. Thống kê doanh thu từ đơn hàng không bị huỷ
    const revenueStats = queryOne(`
      SELECT
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) as totalRevenue,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) as deliveredRevenue,
        COALESCE(AVG(CASE WHEN status != 'cancelled' THEN total ELSE NULL END), 0) as averageOrderValue
      FROM orders
    `)

    // Doanh thu hôm nay
    const today = new Date().toISOString().slice(0, 10)
    const todayStats = queryOne(`
      SELECT
        COALESCE(SUM(total), 0) as todayRevenue,
        COUNT(code) as todayOrders
      FROM orders
      WHERE created_at LIKE ? AND status != 'cancelled'
    `, [`${today}%`])

    // 2. Phân bố trạng thái đơn hàng
    const statusCounts = queryAll(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
    `)
    const orderStatusMap = {
      pending: 0,
      confirmed: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
    }
    let totalOrders = 0
    for (const row of statusCounts) {
      orderStatusMap[row.status] = row.count
      totalOrders += row.count
    }

    // 3. Thống kê kho sách
    const inventoryStats = queryOne(`
      SELECT
        COUNT(*) as totalBooks,
        COALESCE(SUM(stock), 0) as totalStockUnits,
        COALESCE(SUM(sold), 0) as totalSoldUnits,
        COALESCE(SUM(CASE WHEN stock <= 10 THEN 1 ELSE 0 END), 0) as lowStockCount
      FROM books
    `)

    // 4. Thống kê CSKH
    const supportStats = queryOne(`
      SELECT
        COUNT(*) as totalTickets,
        COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0) as openTickets,
        COALESCE(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END), 0) as resolvedTickets
      FROM support_tickets
    `)

    // 5. Thống kê giao hàng đang hoạt động
    const deliveryStats = queryOne(`
      SELECT
        COUNT(*) as totalShipments,
        COALESCE(SUM(CASE WHEN current_status = 'delivering' THEN 1 ELSE 0 END), 0) as activeDelivering,
        COALESCE(SUM(CASE WHEN current_status = 'delivered' THEN 1 ELSE 0 END), 0) as completedDeliveries
      FROM delivery_shipments
    `)

    // 6. Thống kê yêu cầu thu mua sách cũ
    const buybackStats = queryOne(`
      SELECT
        COUNT(*) as totalBuybacks,
        COALESCE(SUM(CASE WHEN status IN ('pending', 'collecting', 'inspecting') THEN 1 ELSE 0 END), 0) as activeBuybacks
      FROM buyback_requests
    `)

    return res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      data: {
        financials: {
          totalRevenue: revenueStats.totalRevenue,
          deliveredRevenue: revenueStats.deliveredRevenue,
          todayRevenue: todayStats.todayRevenue,
          todayOrders: todayStats.todayOrders,
          averageOrderValue: Math.round(revenueStats.averageOrderValue),
        },
        orders: {
          total: totalOrders,
          byStatus: orderStatusMap,
        },
        inventory: {
          totalBooks: inventoryStats.totalBooks,
          totalStockUnits: inventoryStats.totalStockUnits,
          totalSoldUnits: inventoryStats.totalSoldUnits,
          lowStockCount: inventoryStats.lowStockCount,
        },
        support: {
          totalTickets: supportStats.totalTickets,
          openTickets: supportStats.openTickets,
          resolvedTickets: supportStats.resolvedTickets,
          resolutionRate: supportStats.totalTickets > 0
            ? Math.round((supportStats.resolvedTickets / supportStats.totalTickets) * 100)
            : 100,
        },
        logistics: {
          totalShipments: deliveryStats.totalShipments,
          activeDelivering: deliveryStats.activeDelivering,
          completedDeliveries: deliveryStats.completedDeliveries,
        },
        buybacks: {
          totalRequests: buybackStats.totalBuybacks,
          pendingProcessing: buybackStats.activeBuybacks,
        },
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Biểu đồ xu hướng doanh thu theo ngày
 */
export function getRevenueTrends(req, res) {
  try {
    const rows = queryAll(`
      SELECT
        substr(created_at, 1, 10) as date,
        COUNT(code) as orderCount,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) as revenue
      FROM orders
      GROUP BY substr(created_at, 1, 10)
      ORDER BY date ASC
    `)

    return res.json({ ok: true, data: rows })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Top sách bán chạy nhất và doanh thu sinh ra
 */
export function getTopSellingBooks(req, res) {
  try {
    const { limit = 10 } = req.query
    const topBooks = queryAll(`
      SELECT
        b.id, b.title, b.author, b.category, b.cover, b.price, b.stock, b.sold, b.rating,
        COALESCE(SUM(oi.qty), 0) as currentOrderSales,
        COALESCE(SUM(oi.qty * oi.unit_price), 0) as grossRevenue
      FROM books b
      LEFT JOIN order_items oi ON b.id = oi.book_id
      GROUP BY b.id
      ORDER BY (b.sold + COALESCE(SUM(oi.qty), 0)) DESC
      LIMIT ?
    `, [Number(limit)])

    return res.json({ ok: true, count: topBooks.length, data: topBooks })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Cảnh báo tồn kho sách sắp hết hàng (stock <= 10)
 */
export function getInventoryAlerts(req, res) {
  try {
    const alerts = queryAll(`
      SELECT id, title, author, category, stock, price, sold
      FROM books
      WHERE stock <= 10
      ORDER BY stock ASC
    `)

    return res.json({
      ok: true,
      count: alerts.length,
      data: alerts.map((b) => ({
        ...b,
        urgency: b.stock === 0 ? 'out_of_stock' : b.stock <= 5 ? 'critical' : 'warning',
        suggestedRestock: Math.max(30 - b.stock, 10),
      })),
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Thống kê KPI CSKH (phân loại chủ đề, độ hài lòng đánh giá)
 */
export function getSupportKpi(req, res) {
  try {
    const topicBreakdown = queryAll(`
      SELECT topic, COUNT(*) as count
      FROM support_tickets
      GROUP BY topic
    `)

    const reviewMetrics = queryOne(`
      SELECT
        COUNT(*) as totalReviews,
        COALESCE(AVG(rating), 0) as averageRating,
        COALESCE(SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END), 0) as positiveReviews
      FROM book_reviews
    `)

    return res.json({
      ok: true,
      data: {
        ticketsByTopic: topicBreakdown,
        reviews: {
          total: reviewMetrics.totalReviews,
          averageRating: Number(reviewMetrics.averageRating.toFixed(2)),
          positiveRatio: reviewMetrics.totalReviews > 0
            ? Math.round((reviewMetrics.positiveReviews / reviewMetrics.totalReviews) * 100)
            : 100,
        },
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Thống kê hoạt động trực tiếp (Live Simulator - kết hợp số liệu thật & mô phỏng theo giờ)
 */
export function getLiveMetrics(req, res) {
  try {
    const hour = new Date().getHours()
    // Lưu lượng mẫu theo đường cong sinh học trong ngày
    const hourFactors = [
      0.15, 0.08, 0.05, 0.04, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.85,
      0.8, 0.75, 0.85, 0.9, 0.95, 0.9, 0.85, 0.95, 1.0, 0.85, 0.6, 0.35,
    ]
    const factor = hourFactors[hour] || 0.5
    const baseVisitors = Math.round(45 * factor) + Math.floor(Math.random() * 8)
    const activeCarts = Math.max(1, Math.round(baseVisitors * 0.28))

    const recentOrders = queryAll(`
      SELECT code, total, status, created_at, customer_name
      FROM orders
      ORDER BY created_at DESC
      LIMIT 5
    `)

    return res.json({
      ok: true,
      data: {
        onlineVisitors: baseVisitors,
        activeCarts,
        hourlyVelocity: Math.round(baseVisitors * 1.8),
        recentOrders,
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}
