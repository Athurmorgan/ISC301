import { queryAll, queryOne, run, transaction } from '../db.js'
import { refreshBook, toListing } from '../lib/listings.js'
import { BOOKWISE_SELLER, COMMISSION_RATE, CONDITIONS, payoutOf, validateListing } from '../lib/pricing.js'

/**
 * Tin đăng bán. Người bán đã được duyệt tự đăng, sửa giá, tạm ẩn hoặc xoá tin của mình;
 * admin quản lý tin của kho BookWise và gỡ / khôi phục tin vi phạm.
 * Sách vẫn gửi về BookWise kiểm định trước khi giao (ký gửi), người bán nhận tiền sau khi đơn giao thành công.
 */

const isAdmin = (user) => user?.role === 'admin'

const approvedSeller = (email) =>
  email ? queryOne("SELECT full_name FROM seller_applications WHERE email = ? AND status = 'approved'", [email]) : null

/**
 * Danh sách tin. Khách chỉ thấy tin đang bán; admin thêm ?status= để lọc mọi trạng thái.
 * Lọc thêm theo ?bookId= và ?sellerId=
 */
export function getListings(req, res) {
  try {
    const { bookId, sellerId, status } = req.query
    let sql = 'SELECT * FROM listings WHERE 1=1'
    const params = []
    if (!isAdmin(req.user)) {
      sql += " AND status = 'active' AND qty > 0"
    } else if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    if (bookId) {
      sql += ' AND book_id = ?'
      params.push(bookId)
    }
    if (sellerId) {
      sql += ' AND seller_id = ?'
      params.push(sellerId)
    }
    sql += ' ORDER BY price ASC, id ASC'
    return res.json({ ok: true, data: queryAll(sql, params).map(toListing) })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Tin của chính người bán đang đăng nhập (mọi trạng thái)
 */
export function getMyListings(req, res) {
  try {
    const rows = queryAll('SELECT * FROM listings WHERE seller_id = ? ORDER BY updated_at DESC', [req.user.email])
    return res.json({ ok: true, data: rows.map(toListing) })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Tạo mới hoặc sửa tin (PUT idempotent theo id do client sinh).
 * Người bán chỉ đổi được giá, số lượng, mô tả và bật / tạm ẩn; thông tin người bán luôn lấy từ hồ sơ đã duyệt.
 */
export function saveListing(req, res) {
  try {
    const id = String(req.params.id)
    const body = req.body ?? {}
    const admin = isAdmin(req.user)
    const existing = queryOne('SELECT * FROM listings WHERE id = ?', [id])

    let sellerId
    let sellerName
    if (admin && (id.startsWith('bw-') || existing?.seller_id === BOOKWISE_SELLER)) {
      sellerId = BOOKWISE_SELLER
      sellerName = 'BookWise'
    } else if (admin && existing) {
      // Admin sửa tin người bán: giữ nguyên chủ tin
      sellerId = existing.seller_id
      sellerName = existing.seller_name
    } else {
      const seller = approvedSeller(req.user?.email)
      if (!seller) return res.status(403).json({ ok: false, error: 'Bạn cần được BookWise duyệt hồ sơ người bán trước khi đăng tin' })
      if (existing && existing.seller_id !== req.user.email) {
        return res.status(403).json({ ok: false, error: 'Bạn không thể sửa tin của người khác' })
      }
      sellerId = req.user.email
      sellerName = seller.full_name
    }

    const bookId = existing?.book_id ?? String(body.bookId ?? '')
    const book = queryOne('SELECT id, list_price FROM books WHERE id = ?', [bookId])
    const input = {
      condition: body.condition ?? existing?.condition,
      price: Number(body.price ?? existing?.price),
      qty: Number(body.qty ?? existing?.qty ?? 1),
      note: String(body.note ?? existing?.note ?? '').trim(),
    }
    // Giá kho BookWise theo công thức, không bị giới hạn bởi giá trần người bán
    const error =
      sellerId === BOOKWISE_SELLER
        ? !book
          ? 'Đầu sách không tồn tại'
          : !(input.condition in CONDITIONS) || !Number.isInteger(input.price) || input.price <= 0 || !Number.isInteger(input.qty) || input.qty < 0
            ? 'Giá và số lượng không hợp lệ'
            : null
        : validateListing(input, book)
    if (error) return res.status(400).json({ ok: false, error })

    // Tin bị gỡ hoặc đang khoá theo người bán thì người bán không tự mở lại được
    let status = existing?.status ?? 'active'
    if (['active', 'paused'].includes(body.status) && (admin || !['removed', 'suspended'].includes(status))) status = body.status

    const now = new Date().toISOString()
    transaction(() => {
      if (existing) {
        run('UPDATE listings SET condition = ?, price = ?, qty = ?, note = ?, status = ?, updated_at = ? WHERE id = ?', [
          input.condition,
          input.price,
          input.qty,
          input.note,
          status,
          now,
          id,
        ])
      } else {
        run(
          `INSERT INTO listings (id, book_id, seller_id, seller_name, condition, price, qty, sold, note, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
          [id, bookId, sellerId, sellerName, input.condition, input.price, input.qty, input.note, status, now, now]
        )
      }
      refreshBook(bookId)
    })

    const saved = queryOne('SELECT * FROM listings WHERE id = ?', [id])
    return res.status(existing ? 200 : 201).json({ ok: true, message: existing ? 'Đã cập nhật tin đăng' : 'Đã đăng tin', data: toListing(saved) })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Xoá tin. Tin đã có người mua thì chỉ ẩn để giữ lịch sử đơn và đối soát
 */
export function deleteListing(req, res) {
  try {
    const listing = queryOne('SELECT * FROM listings WHERE id = ?', [String(req.params.id)])
    if (!listing) return res.status(404).json({ ok: false, error: 'Không tìm thấy tin đăng' })
    if (!isAdmin(req.user) && listing.seller_id !== req.user.email) {
      return res.status(403).json({ ok: false, error: 'Bạn không thể xoá tin của người khác' })
    }
    transaction(() => {
      if (listing.sold > 0) {
        run("UPDATE listings SET status = 'paused', qty = 0, updated_at = ? WHERE id = ?", [new Date().toISOString(), listing.id])
      } else {
        run('DELETE FROM listings WHERE id = ?', [listing.id])
      }
      refreshBook(listing.book_id)
    })
    return res.json({ ok: true, message: 'Đã xoá tin đăng' })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Admin gỡ tin vi phạm (bắt buộc lý do) hoặc khôi phục tin
 */
export function moderateListing(req, res) {
  try {
    const listing = queryOne('SELECT * FROM listings WHERE id = ?', [String(req.params.id)])
    if (!listing) return res.status(404).json({ ok: false, error: 'Không tìm thấy tin đăng' })
    const { status, reason = '' } = req.body ?? {}
    if (!['removed', 'active'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Trạng thái chỉ nhận removed hoặc active' })
    }
    const note = String(reason).trim().slice(0, 300)
    if (status === 'removed' && !note) return res.status(400).json({ ok: false, error: 'Cần ghi lý do gỡ tin' })
    if (status === 'active' && listing.seller_id !== BOOKWISE_SELLER) {
      const seller = queryOne('SELECT status FROM seller_applications WHERE email = ?', [listing.seller_id])
      if (seller?.status !== 'approved') return res.status(400).json({ ok: false, error: 'Người bán đang bị khoá, không thể khôi phục tin' })
    }
    transaction(() => {
      run('UPDATE listings SET status = ?, reason = ?, updated_at = ? WHERE id = ?', [status, status === 'removed' ? note : null, new Date().toISOString(), listing.id])
      refreshBook(listing.book_id)
    })
    return res.json({ ok: true, message: status === 'removed' ? 'Đã gỡ tin đăng' : 'Đã khôi phục tin đăng', data: toListing(queryOne('SELECT * FROM listings WHERE id = ?', [listing.id])) })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Doanh thu của người bán: từng cuốn đã bán, phí dịch vụ và số tiền nhận về.
 * Tiền chỉ được tính là đã trả khi đơn giao thành công; đơn huỷ không tính.
 */
export function getMyPayouts(req, res) {
  try {
    const rows = queryAll(
      `SELECT i.order_code, i.listing_id, i.book_id, i.title, i.condition, i.unit_price, i.qty, o.status, o.created_at
       FROM order_items i JOIN orders o ON o.code = i.order_code
       WHERE i.seller_id = ? ORDER BY o.created_at DESC`,
      [req.user.email]
    )
    const sales = rows.map((r) => {
      const gross = r.unit_price * r.qty
      const payout = payoutOf(r.unit_price) * r.qty
      return {
        orderCode: r.order_code,
        listingId: r.listing_id,
        bookId: r.book_id,
        title: r.title,
        condition: r.condition,
        qty: r.qty,
        gross,
        fee: gross - payout,
        payout,
        orderStatus: r.status,
        paid: r.status === 'delivered',
        createdAt: r.created_at,
      }
    })
    const live = sales.filter((s) => s.orderStatus !== 'cancelled')
    const sum = (list, key) => list.reduce((s, x) => s + x[key], 0)
    return res.json({
      ok: true,
      data: {
        commissionRate: COMMISSION_RATE,
        summary: {
          soldBooks: sum(live, 'qty'),
          gross: sum(live, 'gross'),
          paid: sum(live.filter((s) => s.paid), 'payout'),
          pending: sum(live.filter((s) => !s.paid), 'payout'),
        },
        sales,
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}
