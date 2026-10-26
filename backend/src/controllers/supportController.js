import { queryAll, queryOne, run } from '../db.js'
import { uniqueCode } from '../lib/codes.js'
import { maskEmail, maskPhone } from '../lib/privacy.js'

const TOPICS = ['order', 'quality', 'payment', 'buyback', 'other']
const TICKET_STATUSES = ['open', 'resolved']
const MAX_MESSAGE = 2000

/**
 * Lấy danh sách phiếu hỗ trợ (Tickets)
 * Hỗ trợ lọc theo: status (open/resolved), topic, orderCode, search (tên/sđt/email)
 */
export function getTickets(req, res) {
  try {
    const { status, topic, orderCode, search } = req.query
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
    let sql = 'SELECT * FROM support_tickets WHERE 1=1'
    const params = []

    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    if (topic) {
      sql += ' AND topic = ?'
      params.push(topic)
    }
    if (orderCode) {
      sql += ' AND order_code = ?'
      params.push(orderCode.trim().toUpperCase())
    }
    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR code LIKE ?)'
      const term = `%${search}%`
      params.push(term, term, term, term)
    }

    sql += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)

    const tickets = queryAll(sql, params)
    return res.json({ ok: true, count: tickets.length, data: tickets })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Lấy chi tiết một phiếu hỗ trợ qua mã ticket
 */
export function getTicketByCode(req, res) {
  try {
    const { code } = req.params
    const ticket = queryOne('SELECT * FROM support_tickets WHERE code = ?', [code.trim().toUpperCase()])
    if (!ticket) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy phiếu hỗ trợ' })
    }
    // Ai có mã phiếu cũng xem được tiến độ, nhưng liên hệ của khách chỉ hiện cho quản trị viên hoặc chính khách
    const full = req.user?.role === 'admin' || req.user?.email?.toLowerCase() === ticket.email.toLowerCase()
    return res.json({ ok: true, data: full ? ticket : { ...ticket, email: maskEmail(ticket.email), phone: maskPhone(ticket.phone) } })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Khách hàng tạo phiếu khiếu nại / hỗ trợ
 */
export function createTicket(req, res) {
  try {
    const { topic, name, email, phone, orderCode, message, attachment } = req.body ?? {}
    if (![topic, name, email, phone, message].every((v) => typeof v === 'string' && v.trim())) {
      return res.status(400).json({
        ok: false,
        error: 'Vui lòng cung cấp chủ đề, họ tên, email, số điện thoại và nội dung yêu cầu',
      })
    }
    if (!TOPICS.includes(topic)) {
      return res.status(400).json({ ok: false, error: 'Chủ đề hỗ trợ không hợp lệ' })
    }
    if (message.length > MAX_MESSAGE) {
      return res.status(400).json({ ok: false, error: `Nội dung tối đa ${MAX_MESSAGE} ký tự` })
    }

    const code = uniqueCode('TK', 6, 'support_tickets')
    const now = new Date().toISOString()
    const cleanOrderCode = orderCode ? orderCode.trim().toUpperCase() : null

    // Kiểm tra mã đơn hàng nếu có
    if (cleanOrderCode) {
      const order = queryOne('SELECT code FROM orders WHERE code = ?', [cleanOrderCode])
      if (!order) {
        return res.status(400).json({ ok: false, error: `Mã đơn hàng ${cleanOrderCode} không tồn tại` })
      }
    }

    run(
      `INSERT INTO support_tickets (
        code, topic, name, email, phone, order_code, message, attachment, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
      [code, topic, name.trim(), email.trim().toLowerCase(), phone.trim(), cleanOrderCode, message.trim(), attachment || null, now]
    )

    const created = queryOne('SELECT * FROM support_tickets WHERE code = ?', [code])
    return res.status(201).json({
      ok: true,
      message: 'Gửi phiếu hỗ trợ thành công. Đội ngũ CSKH BookWise sẽ phản hồi trong vòng 24 giờ.',
      data: created,
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * CSKH phản hồi hoặc đóng phiếu hỗ trợ (Admin hoặc CSKH)
 */
export function replyTicket(req, res) {
  try {
    const { code } = req.params
    const { response, status = 'resolved', responderName } = req.body ?? {}
    if (!TICKET_STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, error: 'Trạng thái phiếu không hợp lệ' })
    }

    const existing = queryOne('SELECT * FROM support_tickets WHERE code = ?', [code.trim().toUpperCase()])
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy phiếu hỗ trợ' })
    }

    const now = new Date().toISOString()
    const finalResponder = responderName || (req.user ? req.user.name : 'CSKH BookWise')

    run(
      `UPDATE support_tickets
       SET response = ?, responder_name = ?, status = ?, resolved_at = ?
       WHERE code = ?`,
      [response ? String(response).trim() : existing.response, finalResponder, status, status === 'resolved' ? now : null, existing.code]
    )

    const updated = queryOne('SELECT * FROM support_tickets WHERE code = ?', [existing.code])
    return res.json({
      ok: true,
      message: 'Cập nhật phản hồi phiếu hỗ trợ thành công',
      data: updated,
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Lấy danh sách câu hỏi thường gặp (FAQs)
 */
export function getFaqs(req, res) {
  try {
    const faqs = queryAll('SELECT * FROM support_faqs ORDER BY category, sort_order ASC')
    return res.json({ ok: true, count: faqs.length, data: faqs })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Lấy danh sách đánh giá sách
 */
export function getReviews(req, res) {
  try {
    const { bookId } = req.query
    let sql = 'SELECT * FROM book_reviews WHERE 1=1'
    const params = []

    if (bookId) {
      sql += ' AND book_id = ?'
      params.push(bookId)
    }

    sql += ' ORDER BY created_at DESC'
    const reviews = queryAll(sql, params)
    return res.json({ ok: true, count: reviews.length, data: reviews })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Gửi đánh giá cho sách
 */
export function createReview(req, res) {
  try {
    const { bookId, rating, body } = req.body ?? {}
    // Khách đã đăng nhập dùng tên/email của tài khoản; khách vãng lai không được tự khai email để lấy nhãn "đã mua"
    const name = req.user?.name ?? req.body?.name
    const email = req.user?.email ?? null
    if (!bookId || !name || !rating || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ ok: false, error: 'Thiếu thông tin đánh giá bắt buộc' })
    }

    const numRating = Number(rating)
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ ok: false, error: 'Điểm đánh giá phải từ 1 đến 5 sao' })
    }

    const book = queryOne('SELECT id, rating, rating_count FROM books WHERE id = ?', [bookId])
    if (!book) {
      return res.status(404).json({ ok: false, error: 'Sách không tồn tại' })
    }

    // Kiểm tra xem khách có đơn hàng đã giao cho sách này không
    let verifiedPurchase = 0
    if (email) {
      const order = queryOne(
        `SELECT o.code FROM orders o
         JOIN order_items oi ON o.code = oi.order_code
         WHERE (o.user_email = ? OR o.customer_email = ?) AND oi.book_id = ? AND o.status = 'delivered'`,
        [email.toLowerCase(), email.toLowerCase(), bookId]
      )
      if (order) verifiedPurchase = 1
    }

    const now = new Date().toISOString()
    run(
      `INSERT INTO book_reviews (book_id, name, email, rating, body, verified_purchase, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [bookId, String(name).trim(), email, numRating, body.trim().slice(0, MAX_MESSAGE), verifiedPurchase, now]
    )

    // Cập nhật điểm đánh giá trung bình của sách
    const stats = queryOne(
      'SELECT AVG(rating) as avgRating, COUNT(id) as count FROM book_reviews WHERE book_id = ?',
      [bookId]
    )
    if (stats) {
      run(
        'UPDATE books SET rating = ROUND(?, 1), rating_count = ? WHERE id = ?',
        [stats.avgRating, stats.count, bookId]
      )
    }

    return res.status(201).json({
      ok: true,
      message: 'Cảm ơn bạn đã gửi đánh giá sách!',
      verifiedPurchase: Boolean(verifiedPurchase),
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}
