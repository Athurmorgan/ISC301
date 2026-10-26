import { Router } from 'express'
import {
  getInventoryAlerts,
  getLiveMetrics,
  getRevenueTrends,
  getSummary,
  getSupportKpi,
  getTopSellingBooks,
} from '../controllers/dashboardController.js'

const router = Router()

router.get('/summary', getSummary)
router.get('/revenue-trend', getRevenueTrends)
router.get('/top-books', getTopSellingBooks)
router.get('/inventory-alerts', getInventoryAlerts)
router.get('/support-kpi', getSupportKpi)
router.get('/live', getLiveMetrics)

export default router
