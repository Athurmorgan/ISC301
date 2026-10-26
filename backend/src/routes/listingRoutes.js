import { Router } from 'express'
import {
  deleteListing,
  getListings,
  getMyListings,
  getMyPayouts,
  moderateListing,
  saveListing,
} from '../controllers/listingController.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', getListings)
router.get('/mine', requireAuth, getMyListings)
router.get('/payouts', requireAuth, getMyPayouts)
router.put('/:id', requireAuth, saveListing)
router.delete('/:id', requireAuth, deleteListing)
router.patch('/:id/status', requireAdmin, moderateListing)

export default router
