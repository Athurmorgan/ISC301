import { queryAll, queryOne, run, transaction } from '../db.js'
import { uniqueCode } from '../lib/codes.js'
import { addStoreStock } from '../lib/listings.js'
import { BUYBACK_RATES, buybackQuote } from '../lib/pricing.js'
import { maskAccount, maskPhone } from '../lib/privacy.js'

const STATUSES = ['pending', 'collecting', 'inspecting', 'paid', 'rejected']
const DEFAULT_ESTIMATE = 50000

/** Báo giá theo giá bán bản mới của sách trong kho, khớp với front-end; sách ngoài kho dùng giá khách nhập */
function estimate(bookId, condition, fallbackPrice) {
  const book = bookId ? queryOne('SELECT list_price FROM books WHERE id = ?', [bookId]) : null
  if (book) return { basePrice: book.list_price, estimatedPrice: buybackQuote(book, condition) }
  const basePrice = Math.max(0, Number(fallbackPrice) || 0)
  return { basePrice, estimatedPrice: basePrice ? buybackQuote({ list_price: basePrice }, condition) : DEFAULT_ESTIMATE }
}

const isAdmin = (req) => req.user?.role === 'admin'

/** Người không phải quản trị chỉ thấy số tài khoản và SĐT đã che */
const forViewer = (req, row) => (isAdmin(req) ? row : { ...row, bank_account: maskAccount(row.bank_account), phone: maskPhone(row.phone) })

/**
 * Ước tính giá thu mua sách cũ
 */
export function estimateBuyback(req, res) {
  try {
    const { bookId, listPrice, condition } = req.body ?? {}
    if (!(condition in BUYBACK_RATES) || (!bookId && !listPrice)) {
      return res.status(400).json({ ok: false, error: 'Thiếu thông tin sách hoặc tình trạng (likenew / used)' })
    }

    const rate = BUYBACK_RATES[condition]
    const { basePrice, estimatedPrice } = estimate(bookId, condition, listPrice)

    return res.json({
      ok: true,
      data: {
        condition,
        ratePercent: Math.round(rate * 100),
        basePrice,
        estimatedPrice,
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Khách gửi yêu cầu bán lại sách cũ
 */
export function createBuyback(req, res) {
  try {
    const {
      bookId,
      bookTitle,
      author,
      condition = 'likenew',
      customerName,
      phone,
      email,
      address,
      bankName,
      bankAccount,
      accountHolder,
      note,
      photo,
    } = req.body ?? {}

    if (!(condition in BUYBACK_RATES)) {
      return res.status(400).json({ ok: false, error: 'Tình trạng sách chỉ nhận likenew hoặc used' })
    }
    if (!bookTitle || !author || !customerName || !phone || !address || !bankName || !bankAccount || !accountHolder) {
      return res.status(400).json({
        ok: false,
        error: 'Vui lòng điền đầy đủ thông tin sách, thông tin liên hệ và tài khoản ngân hàng nhận tiền',
      })
    }

    const { estimatedPrice } = estimate(bookId, condition)
    const code = uniqueCode('BB', 6, 'buyback_requests')
    const now = new Date().toISOString()

    transaction(() => {
      run(
        `INSERT INTO buyback_requests (
          code, book_id, book_title, author, condition, estimated_price,
          customer_name, phone, email, address, bank_name, bank_account, account_holder,
          note, photo, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          code,
          bookId || null,
          bookTitle.trim(),
          author.trim(),
          condition,
          estimatedPrice,
          customerName.trim(),
          phone.trim(),
          email ? email.trim().toLowerCase() : null,
          address.trim(),
          bankName.trim(),
          bankAccount.trim(),
          accountHolder.trim().toUpperCase(),
          note ? note.trim() : null,
          photo || null,
          now,
          now,
        ]
      )

      run(
        `INSERT INTO buyback_history (buyback_code, status, note, created_at)
         VALUES (?, 'pending', 'Khách hàng gửi yêu cầu thu mua sách cũ', ?)`,
        [code, now]
      )
    })

    const created = queryOne('SELECT * FROM buyback_requests WHERE code = ?', [code])
    return res.status(201).json({
      ok: true,
      message: 'Gửi yêu cầu thu mua sách thành công!',
      data: created,
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Lấy danh sách yêu cầu bán lại sách cũ: admin thấy tất cả, khách đăng nhập chỉ thấy yêu cầu của mình
 */
export function getBuybacks(req, res) {
  try {
    const { status, search } = req.query
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
    let sql = 'SELECT * FROM buyback_requests WHERE 1=1'
    const params = []

    if (!isAdmin(req)) {
      if (!req.user?.email) {
        return res.status(401).json({ ok: false, error: 'Vui lòng đăng nhập để xem yêu cầu thu mua của bạn' })
      }
      sql += ' AND lower(email) = ?'
      params.push(req.user.email.toLowerCase())
    }

    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }

    if (search) {
      sql += ' AND (code LIKE ? OR book_title LIKE ? OR customer_name LIKE ? OR phone LIKE ?)'
      const term = `%${search}%`
      params.push(term, term, term, term)
    }

    sql += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)

    const list = queryAll(sql, params).map((row) => forViewer(req, row))
    return res.json({ ok: true, count: list.length, data: list })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Lấy chi tiết một yêu cầu thu mua theo mã
 */
export function getBuybackByCode(req, res) {
  try {
    const { code } = req.params
    const cleanCode = code.trim().toUpperCase()

    const buyback = queryOne('SELECT * FROM buyback_requests WHERE code = ?', [cleanCode])
    if (!buyback) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy yêu cầu thu mua' })
    }

    const history = queryAll('SELECT * FROM buyback_history WHERE buyback_code = ? ORDER BY created_at ASC', [cleanCode])

    return res.json({
      ok: true,
      data: {
        buyback: forViewer(req, buyback),
        history,
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Cập nhật trạng thái thu mua (Admin thẩm định, duyệt, giải ngân)
 */
export function updateBuybackStatus(req, res) {
  try {
    const { code } = req.params
    const { status, finalPrice, note } = req.body ?? {}
    const cleanCode = code.trim().toUpperCase()

    if (!STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, error: 'Trạng thái thu mua không hợp lệ' })
    }
    const buyback = queryOne('SELECT * FROM buyback_requests WHERE code = ?', [cleanCode])
    if (!buyback) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy yêu cầu thu mua' })
    }
    if (buyback.status === 'paid' || buyback.status === 'rejected') {
      return res.status(400).json({ ok: false, error: 'Yêu cầu thu mua đã kết thúc, không thể cập nhật' })
    }

    const now = new Date().toISOString()
    const finalAmount = finalPrice !== undefined && finalPrice !== null ? Number(finalPrice) : buyback.estimated_price
    if (!Number.isFinite(finalAmount) || finalAmount < 0) {
      return res.status(400).json({ ok: false, error: 'Giá thu mua không hợp lệ' })
    }

    transaction(() => {
      run(
        `UPDATE buyback_requests
         SET status = ?, final_price = ?, updated_at = ?
         WHERE code = ?`,
        [status, finalAmount, now, cleanCode]
      )

      const historyNote = note || `Chuyển trạng thái sang ${status}${status === 'paid' ? ` (Đã thanh toán ${finalAmount.toLocaleString('vi-VN')}đ)` : ''}`
      run(
        `INSERT INTO buyback_history (buyback_code, status, note, created_at)
         VALUES (?, ?, ?, ?)`,
        [cleanCode, status, historyNote, now]
      )

      // Nếu đã thanh toán và có liên kết với bookId: tăng số lượng tồn kho sách
      if (status === 'paid' && buyback.book_id) {
        // Sách thu mua về được nhập vào tin của kho BookWise đúng tình trạng
        addStoreStock(buyback.book_id, buyback.condition, 1, now)
      }
    })

    const updated = queryOne('SELECT * FROM buyback_requests WHERE code = ?', [cleanCode])
    return res.json({
      ok: true,
      message: 'Cập nhật trạng thái thu mua thành công',
      data: updated,
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}
