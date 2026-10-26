import { Router } from 'express'
import {
  applySeller,
  getApplication,
  getApplications,
  getMyApplication,
  reviewApplication,
} from '../controllers/sellerController.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/apply', requireAuth, applySeller)
router.get('/me', requireAuth, getMyApplication)
router.get('/', requireAdmin, getApplications)
router.get('/:email', requireAdmin, getApplication)
router.patch('/:email/status', requireAdmin, reviewApplication)

export default router
