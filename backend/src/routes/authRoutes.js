import { Router } from 'express'
import { getProfile, login, register, verifyApiKey } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/login', login)
router.post('/register', register)
router.get('/me', requireAuth, getProfile)
router.get('/verify-api-key', verifyApiKey)

export default router
