import { Router } from 'express'
import {
  createBuyback,
  estimateBuyback,
  getBuybackByCode,
  getBuybacks,
  updateBuybackStatus,
} from '../controllers/buybackController.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.post('/estimate', estimateBuyback)
router.post('/', createBuyback)
router.get('/', getBuybacks)
router.get('/:code', getBuybackByCode)
router.patch('/:code/status', requireAdmin, updateBuybackStatus)

export default router
