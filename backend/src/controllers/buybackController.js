import { queryAll, queryOne, run, transaction } from '../db.js'

const BUYBACK_RATES = {
  likenew: 0.45,
  used: 0.3,
}

function generateBuybackCode() {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `BB-${num}`
}

/**
 * Ước tính giá thu mua sách cũ
 */
export function estimateBuyback(req, res) {
  try {
    const { bookId, listPrice, condition } = req.body
    if (!condition || (!bookId && !listPrice)) {
      return res.status(400).json({ ok: false, error: 'Thiếu thông tin sách hoặc tình trạng' })
    }

    const rate = BUYBACK_RATES[condition] || 0.3
    let basePrice = Number(listPrice || 0)

    if (bookId) {
      const book = queryOne('SELECT list_price, price FROM books WHERE id = ?', [bookId])
      if (book) {
        basePrice = book.list_price || book.price
      }
    }

    const estimatedPrice = Math.round(basePrice * rate)

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
    } = req.body

    if (!bookTitle || !author || !customerName || !phone || !address || !bankName || !bankAccount || !accountHolder) {
      return res.status(400).json({
        ok: false,
        error: 'Vui lòng điền đầy đủ thông tin sách, thông tin liên hệ và tài khoản ngân hàng nhận tiền',
      })
    }

    // Tính giá ước tính
    let estimatedPrice = 50000
    if (bookId) {
      const book = queryOne('SELECT price, list_price FROM books WHERE id = ?', [bookId])
      if (book) {
        estimatedPrice = Math.round((book.list_price || book.price) * (BUYBACK_RATES[condition] || 0.3))
      }
    }

    const code = generateBuybackCode()
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
          email ? email.trim() : null,
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
 * Lấy danh sách yêu cầu bán lại sách cũ
 */
export function getBuybacks(req, res) {
  try {
    const { status, search, limit = 50 } = req.query
    let sql = 'SELECT * FROM buyback_requests WHERE 1=1'
    const params = []

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
    params.push(Number(limit))

    const list = queryAll(sql, params)
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
        buyback,
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
    const { status, finalPrice, note } = req.body
    const cleanCode = code.trim().toUpperCase()

    const buyback = queryOne('SELECT * FROM buyback_requests WHERE code = ?', [cleanCode])
    if (!buyback) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy yêu cầu thu mua' })
    }

    const now = new Date().toISOString()
    const finalAmount = finalPrice !== undefined ? Number(finalPrice) : buyback.estimated_price

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
        run('UPDATE books SET stock = stock + 1 WHERE id = ?', [buyback.book_id])
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
