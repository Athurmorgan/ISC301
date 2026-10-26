import { Router } from 'express'
import {
  getInventoryAlerts,
  getLiveMetrics,
  getRevenueTrends,
  getSummary,
  getSupportKpi,
  getTopSellingBooks,
} from '../controllers/dashboardController.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

// Doanh thu, tồn kho, KPI CSKH là số liệu nội bộ
router.use(requireAdmin)

router.get('/summary', getSummary)
router.get('/revenue-trend', getRevenueTrends)
router.get('/top-books', getTopSellingBooks)
router.get('/inventory-alerts', getInventoryAlerts)
router.get('/support-kpi', getSupportKpi)
router.get('/live', getLiveMetrics)

export default router
