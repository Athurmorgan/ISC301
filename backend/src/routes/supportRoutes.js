import { Router } from 'express'
import {
  createReview,
  createTicket,
  getFaqs,
  getReviews,
  getTicketByCode,
  getTickets,
  replyTicket,
} from '../controllers/supportController.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

// Tickets
router.get('/tickets', requireAdmin, getTickets)
router.get('/tickets/:code', getTicketByCode)
router.post('/tickets', createTicket)
router.patch('/tickets/:code/reply', requireAdmin, replyTicket)

// FAQs
router.get('/faqs', getFaqs)

// Reviews
router.get('/reviews', getReviews)
router.post('/reviews', createReview)

export default router
