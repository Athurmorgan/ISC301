import { Router } from 'express'
import {
  dispatchShipment,
  getCarriers,
  getShippingMethods,
  getTracking,
  updateTrackingStatus,
} from '../controllers/deliveryController.js'
import { requireAdminOrPartner } from '../middleware/auth.js'

const router = Router()

// Public
router.get('/methods', getShippingMethods)
router.get('/carriers', getCarriers)
router.get('/track/:trackingCode', getTracking)

// Admin & Partner (AhaMove, GHN webhook)
router.post('/dispatch', requireAdminOrPartner, dispatchShipment)
router.post('/update-status', requireAdminOrPartner, updateTrackingStatus)

export default router
