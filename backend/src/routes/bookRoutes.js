import { Router } from 'express'
import {
  createBook,
  deleteBook,
  getBookById,
  getBooks,
  getCategories,
  updateBook,
} from '../controllers/bookController.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/categories', getCategories)
router.get('/', getBooks)
router.get('/:id', getBookById)

// Admin / API Key protected
router.post('/', requireAdmin, createBook)
router.put('/:id', requireAdmin, updateBook)
router.delete('/:id', requireAdmin, deleteBook)

export default router
