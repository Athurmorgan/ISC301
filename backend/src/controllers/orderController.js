import { queryAll, queryOne, run, transaction } from '../db.js'
import { uniqueCode } from '../lib/codes.js'
import { addStoreStock, refreshBook } from '../lib/listings.js'
import { applyCoupons, parseItem } from '../lib/pricing.js'
import { canSeeOrder, isOwner, maskOrder, samePhone } from '../lib/privacy.js'
import { isStaff } from '../middleware/auth.js'

const PAYMENTS = {
  vietqr: 'Chuyển khoản VietQR',
  ewallet: 'Ví MoMo / ZaloPay',
  card: 'Thẻ ATM / Visa / Mastercard',
  cod: 'Thanh toán khi nhận hàng (COD)',
}

const STATUS_HINTS = {
  pending: 'Chờ xác nhận tồn kho',
  confirmed: 'Sách đã qua kiểm định và được đóng gói',
  shipping: 'Đơn vị vận chuyển đang giao sách đến bạn',
  delivered: 'Bạn đã nhận được sách',
  cancelled: 'Đơn hàng đã bị huỷ',
}

/** Trạng thái kế tiếp hợp lệ: chỉ đi tới, được huỷ khi chưa giao cho vận chuyển */
const NEXT_STATUS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [],
  cancelled: [],
}

const DEMO_OTP = '123456'
const MAX_LINES = 50

const normalizeCode = (code) => String(code ?? '').trim().toUpperCase()

const findCoupons = (codes) =>
  [...new Set((Array.isArray(codes) ? codes : []).map(normalizeCode).filter(Boolean))]
    .map((code) => queryOne('SELECT * FROM coupons WHERE code = ? AND active = 1', [code]))
    .filter(Boolean)

/**
 * Tính giỏ hàng dùng chung cho /calculate-cart và /checkout để hai chỗ luôn ra cùng một con số.
 * Mỗi dòng gắn với một tin đăng (của kho BookWise hoặc người bán); giá và số cuốn còn lại lấy theo tin đó.
 * Client cũ chỉ gửi bookId + condition thì chọn tin rẻ nhất đang bán đúng tình trạng.
 * `strict` = true khi đặt hàng: sách không tồn tại hoặc thiếu hàng là lỗi; khi chỉ tính thử thì bỏ qua dòng lỗi.
 */
function priceCart({ items, shippingId = 'standard', couponCodes = [] }, strict, buyerEmail = null) {
  if (!Array.isArray(items)) return { error: 'Danh sách sản phẩm không hợp lệ' }
  if (items.length > MAX_LINES) return { error: `Giỏ hàng tối đa ${MAX_LINES} dòng` }

  const shipping = queryOne('SELECT * FROM shipping_methods WHERE id = ?', [shippingId])
  if (!shipping) return { error: 'Phương thức giao hàng không hợp lệ' }

  const lines = []
  const needed = new Map()
  for (const raw of items) {
    const item = parseItem(raw)
    if (item.error) {
      if (strict) return { error: item.error }
      continue
    }
    let listing = item.listingId ? queryOne("SELECT * FROM listings WHERE id = ? AND status = 'active'", [item.listingId]) : null
    if (!listing && item.bookId) {
      listing = queryOne(
        "SELECT * FROM listings WHERE book_id = ? AND condition = ? AND status = 'active' AND qty > 0 ORDER BY price ASC, id ASC LIMIT 1",
        [item.bookId, item.condition]
      )
    }
    const book = listing && queryOne('SELECT * FROM books WHERE id = ?', [listing.book_id])
    if (!book) {
      if (strict) return { error: `Sách mã ${item.listingId ?? item.bookId} không còn được bán` }
      continue
    }
    if (buyerEmail && listing.seller_id === buyerEmail) {
      if (strict) return { error: `Bạn không thể mua tin đăng của chính mình ("${book.title}")` }
      continue
    }
    const price = listing.price
    needed.set(listing.id, (needed.get(listing.id) ?? 0) + item.qty)
    lines.push({
      listingId: listing.id,
      sellerId: listing.seller_id,
      sellerName: listing.seller_name,
      bookId: book.id,
      title: book.title,
      author: book.author,
      cover: book.cover,
      category: book.category,
      condition: listing.condition,
      unitPrice: price,
      qty: item.qty,
      lineTotal: price * item.qty,
      stock: listing.qty,
    })
  }

  if (strict) {
    for (const [listingId, qty] of needed) {
      const line = lines.find((l) => l.listingId === listingId)
      if (line.stock < qty) return { error: `Sách "${line.title}" của ${line.sellerName} chỉ còn ${line.stock} cuốn` }
    }
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const { discount, shippingDiscount, applied } = applyCoupons(findCoupons(couponCodes), subtotal, shipping.fee)
  const finalShippingFee = shipping.fee - shippingDiscount

  return {
    shipping,
    lines: lines.map(({ stock: _stock, ...l }) => l),
    needed,
    subtotal,
    discount,
    shippingDiscount,
    finalShippingFee,
    total: subtotal - discount + finalShippingFee,
    appliedCoupons: applied,
  }
}

/**
 * Kiểm tra và áp dụng mã giảm giá
 */
export function applyCoupon(req, res) {
  try {
    const { code, subtotal = 0, shippingFee = 0 } = req.body ?? {}
    if (!code) {
      return res.status(400).json({ ok: false, error: 'Vui lòng nhập mã giảm giá' })
    }

    const [coupon] = findCoupons([code])
    if (!coupon) {
      return res.status(404).json({ ok: false, error: 'Mã giảm giá không tồn tại hoặc đã hết hạn' })
    }

    const amount = Math.max(0, Number(subtotal) || 0)
    if (amount < coupon.min_subtotal) {
      return res.status(400).json({
        ok: false,
        error: `Mã ${coupon.code} chỉ áp dụng cho đơn hàng từ ${coupon.min_subtotal.toLocaleString('vi-VN')}đ`,
      })
    }

    const { discount, shippingDiscount } = applyCoupons([coupon], amount, Math.max(0, Number(shippingFee) || 0) || coupon.value)
    return res.json({
      ok: true,
      message: 'Áp dụng mã giảm giá thành công',
      data: {
        code: coupon.code,
        kind: coupon.kind,
        value: coupon.value,
        discount,
        shippingDiscount,
        description: coupon.description,
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Tính toán giỏ hàng: tổng tiền, chiết khấu, phí vận chuyển
 */
export function calculateCart(req, res) {
  try {
    const cart = priceCart(req.body ?? {}, false)
    if (cart.error) return res.status(400).json({ ok: false, error: cart.error })

    return res.json({
      ok: true,
      data: {
        lines: cart.lines,
        itemCount: cart.lines.reduce((acc, l) => acc + l.qty, 0),
        subtotal: cart.subtotal,
        discount: cart.discount,
        shippingFee: cart.shipping.fee,
        shippingDiscount: cart.shippingDiscount,
        finalShippingFee: cart.finalShippingFee,
        total: cart.total,
        appliedCoupons: cart.appliedCoupons,
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Đặt hàng (Transaction Checkout)
 * - Kiểm tra & trừ tồn kho trong cùng transaction
 * - Tạo đơn hàng, chi tiết đơn hàng, lịch sử khởi tạo
 * - Đơn thanh toán online được tạo ở trạng thái chưa trả tiền; gọi /process-payment để xác nhận
 */
export function placeOrder(req, res) {
  try {
    const { customer, items = [], shippingId = 'standard', paymentId = 'cod', couponCodes = [], note = '' } = req.body ?? {}

    const required = ['name', 'phone', 'province', 'district', 'street']
    if (!customer || required.some((k) => typeof customer[k] !== 'string' || !customer[k].trim())) {
      return res.status(400).json({ ok: false, error: 'Vui lòng cung cấp đầy đủ thông tin người nhận và địa chỉ' })
    }
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ ok: false, error: 'Giỏ hàng đang trống' })
    }
    if (!(paymentId in PAYMENTS)) {
      return res.status(400).json({ ok: false, error: 'Phương thức thanh toán không hợp lệ' })
    }

    const newOrder = transaction(() => {
      // Tính lại giá trong transaction để tồn kho đọc được là số mới nhất
      const cart = priceCart({ items, shippingId, couponCodes }, true, req.user?.email ?? null)
      if (cart.error) throw new Error(cart.error)

      const { shipping } = cart
      if (shipping.provinces_json) {
        const allowed = JSON.parse(shipping.provinces_json)
        if (!allowed.includes(customer.province)) {
          throw new Error(`${shipping.name} chỉ áp dụng tại ${allowed.join(' và ')}`)
        }
      }

      const touched = new Set()
      for (const [listingId, qty] of cart.needed) {
        const result = run(
          "UPDATE listings SET qty = qty - ?, sold = sold + ?, updated_at = ? WHERE id = ? AND qty >= ? AND status = 'active'",
          [qty, qty, new Date().toISOString(), listingId, qty]
        )
        if (result.changes !== 1) throw new Error('Một số sách vừa hết hàng, vui lòng tải lại giỏ hàng')
        const { bookId } = cart.lines.find((l) => l.listingId === listingId)
        run('UPDATE books SET sold = sold + ? WHERE id = ?', [qty, bookId])
        touched.add(bookId)
      }
      for (const bookId of touched) refreshBook(bookId)

      const orderCode = uniqueCode('BW', 6, 'orders')
      const now = new Date().toISOString()
      const userEmail = req.user?.email ?? null
      const email = typeof customer.email === 'string' ? customer.email.trim().toLowerCase() : ''

      run(
        `INSERT INTO orders (
          code, user_email, customer_name, customer_phone, customer_email,
          customer_province, customer_district, customer_street, note,
          shipping_id, shipping_name, shipping_fee, payment_id, payment_name, is_paid,
          subtotal, discount, shipping_discount, total, status, eta, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          orderCode,
          userEmail,
          customer.name.trim(),
          customer.phone.trim(),
          email,
          customer.province,
          customer.district,
          customer.street.trim(),
          String(note ?? '').trim(),
          shipping.id,
          shipping.name,
          shipping.fee,
          paymentId,
          PAYMENTS[paymentId],
          cart.subtotal,
          cart.discount,
          cart.shippingDiscount,
          cart.total,
          shipping.eta,
          now,
          now,
        ]
      )

      for (const it of cart.lines) {
        run(
          `INSERT INTO order_items (order_code, book_id, listing_id, seller_id, seller_name, title, author, cover, category, condition, unit_price, qty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderCode, it.bookId, it.listingId, it.sellerId, it.sellerName, it.title, it.author, it.cover, it.category, it.condition, it.unitPrice, it.qty]
        )
      }

      const initialNote = paymentId === 'cod' ? 'Đơn thanh toán khi nhận hàng, chờ xác nhận' : 'Đơn đã tạo, chờ thanh toán trực tuyến'
      run(`INSERT INTO order_history (order_code, status, note, created_at) VALUES (?, 'pending', ?, ?)`, [orderCode, initialNote, now])

      return {
        orderCode,
        subtotal: cart.subtotal,
        discount: cart.discount,
        shippingFee: shipping.fee,
        shippingDiscount: cart.shippingDiscount,
        total: cart.total,
        paymentId,
        paymentName: PAYMENTS[paymentId],
        isPaid: 0,
        appliedCoupons: cart.appliedCoupons.map((c) => c.code),
        items: cart.lines,
        createdAt: now,
      }
    })

    return res.status(201).json({ ok: true, message: 'Đặt hàng thành công!', data: newOrder })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message })
  }
}

/**
 * Giả lập và xác thực thanh toán (VietQR, Thẻ OTP, Ví điện tử)
 * - vietqr: lần đầu trả thông tin QR; gửi lại kèm `confirm: true` để ghi nhận đã chuyển khoản (giả lập)
 * - card: bắt buộc OTP (mã thử 123456)
 */
export function processPayment(req, res) {
  try {
    const { orderCode, otp, confirm } = req.body ?? {}
    if (!orderCode) {
      return res.status(400).json({ ok: false, error: 'Thiếu mã đơn hàng' })
    }

    const order = queryOne('SELECT * FROM orders WHERE code = ?', [normalizeCode(orderCode)])
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy đơn hàng' })
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ ok: false, error: 'Đơn hàng đã huỷ, không thể thanh toán' })
    }
    if (order.is_paid) {
      return res.status(409).json({ ok: false, error: 'Đơn hàng đã được thanh toán' })
    }
    // Phương thức lấy theo đơn, không theo request, để không thể đổi sang cách không cần xác thực
    const method = order.payment_id
    if (method === 'cod') {
      return res.status(400).json({ ok: false, error: 'Đơn COD được thanh toán khi nhận hàng' })
    }

    if (method === 'vietqr' && !confirm) {
      const content = `THANH TOAN ${order.code}`
      return res.json({
        ok: true,
        method: 'vietqr',
        qrData: {
          bank: 'MB Bank',
          bin: '970422',
          accountNumber: '0123456789',
          accountName: 'BOOKWISE STORE',
          amount: order.total,
          content,
          qrUrl: `https://img.vietqr.io/image/970422-0123456789-compact2.png?amount=${order.total}&addInfo=${encodeURIComponent(content)}&accountName=BOOKWISE%20STORE`,
        },
      })
    }

    if (method === 'card' && otp !== DEMO_OTP) {
      return res.status(400).json({ ok: false, error: 'Mã OTP không chính xác (mã thử nghiệm: 123456)' })
    }

    const now = new Date().toISOString()
    transaction(() => {
      run('UPDATE orders SET is_paid = 1, updated_at = ? WHERE code = ?', [now, order.code])
      run(
        `INSERT INTO order_history (order_code, status, note, created_at)
         VALUES (?, ?, ?, ?)`,
        [order.code, order.status, `Đã nhận thanh toán qua ${order.payment_name}`, now]
      )
    })

    return res.json({ ok: true, message: 'Xác thực thanh toán thành công!', orderCode: order.code, isPaid: true })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * LUỒNG 3: Tra cứu & Theo dõi đơn hàng bằng mã đơn (Public Tracking)
 * Người lạ chỉ thấy trạng thái và thông tin đã che; chủ đơn, quản trị hoặc người nhập đúng
 * 4 số cuối SĐT (?phone=) thấy đầy đủ.
 */
export function trackOrder(req, res) {
  try {
    const cleanCode = normalizeCode(req.params.code)
    const order = queryOne('SELECT * FROM orders WHERE code = ?', [cleanCode])
    if (!order) {
      return res.status(404).json({ ok: false, error: `Không tìm thấy đơn hàng có mã ${cleanCode}` })
    }

    const full = canSeeOrder(req.user, order, req.query.phone)
    const items = queryAll('SELECT * FROM order_items WHERE order_code = ?', [cleanCode])
    const timeline = queryAll('SELECT * FROM order_history WHERE order_code = ? ORDER BY created_at ASC, id ASC', [cleanCode])

    let logistics = null
    if (order.tracking_code) {
      const shipment = queryOne('SELECT * FROM delivery_shipments WHERE tracking_code = ?', [order.tracking_code])
      if (shipment) {
        logistics = {
          carrier: shipment.carrier_name,
          trackingCode: shipment.tracking_code,
          shipperName: shipment.shipper_name,
          shipperPhone: full ? shipment.shipper_phone : null,
          currentStatus: shipment.current_status,
          destination: full ? shipment.destination : order.customer_province,
          checkpoints: queryAll('SELECT * FROM delivery_checkpoints WHERE shipment_id = ? ORDER BY event_time ASC', [shipment.id]),
        }
      }
    }

    return res.json({
      ok: true,
      data: { order: full ? order : maskOrder(order), items, timeline, logistics },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * LUỒNG 3: Tra cứu danh sách đơn hàng bằng SĐT hoặc Email (không cần login).
 * Chỉ trả mã đơn, trạng thái và số tiền; thông tin người nhận luôn được che.
 */
export function lookupOrders(req, res) {
  try {
    const { phone, email } = req.body ?? {}
    if (!phone && !email) {
      return res.status(400).json({ ok: false, error: 'Vui lòng cung cấp Số điện thoại hoặc Email để tra cứu' })
    }

    const conditions = []
    const params = []
    if (phone) {
      conditions.push('customer_phone = ?')
      params.push(String(phone).trim())
    }
    if (email) {
      conditions.push('customer_email = ?')
      params.push(String(email).trim().toLowerCase())
    }

    const orders = queryAll(
      `SELECT code, customer_name, customer_phone, total, status, created_at, tracking_carrier, tracking_code
       FROM orders WHERE ${conditions.join(' OR ')} ORDER BY created_at DESC LIMIT 20`,
      params
    ).map((o) => (isStaff(req.user) ? o : { ...o, ...maskOrder(o) }))

    return res.json({ ok: true, count: orders.length, data: orders })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/** Hoàn lại tồn kho của một đơn; gọi trong transaction */
/** Trả sách của đơn bị huỷ về đúng tin đăng; đơn cũ chưa ghi tin đăng thì nhập vào kho BookWise */
function restock(code) {
  const now = new Date().toISOString()
  const items = queryAll('SELECT book_id, listing_id, condition, qty FROM order_items WHERE order_code = ?', [code])
  for (const it of items) {
    run('UPDATE books SET sold = MAX(0, sold - ?) WHERE id = ?', [it.qty, it.book_id])
    const listing = it.listing_id && queryOne('SELECT id FROM listings WHERE id = ?', [it.listing_id])
    if (listing) {
      run('UPDATE listings SET qty = qty + ?, sold = MAX(0, sold - ?), updated_at = ? WHERE id = ?', [it.qty, it.qty, now, listing.id])
      refreshBook(it.book_id)
    } else {
      addStoreStock(it.book_id, it.condition === 'likenew' ? 'likenew' : 'used', it.qty, now)
    }
  }
}

/**
 * LUỒNG 3: Khách hàng tự huỷ đơn khi đơn còn 'pending'.
 * Cần đăng nhập đúng chủ đơn hoặc gửi kèm SĐT người nhận (`phone`) để xác minh.
 */
export function cancelOrder(req, res) {
  try {
    const cleanCode = normalizeCode(req.params.code)
    const { reason = 'Khách hàng yêu cầu hủy đơn', phone } = req.body ?? {}

    const order = queryOne('SELECT * FROM orders WHERE code = ?', [cleanCode])
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy đơn hàng' })
    }
    if (!(req.user?.role === 'admin' || isOwner(req.user, order) || samePhone(phone, order.customer_phone))) {
      return res.status(403).json({ ok: false, error: 'Vui lòng đăng nhập hoặc nhập đúng số điện thoại người nhận để huỷ đơn' })
    }
    if (order.status !== 'pending') {
      return res.status(400).json({
        ok: false,
        error: `Không thể hủy đơn hàng đang ở trạng thái "${order.status}". Vui lòng liên hệ CSKH để được trợ giúp.`,
      })
    }

    const now = new Date().toISOString()
    transaction(() => {
      restock(cleanCode)
      run('UPDATE orders SET status = ?, updated_at = ? WHERE code = ?', ['cancelled', now, cleanCode])
      run(
        `INSERT INTO order_history (order_code, status, note, created_at)
         VALUES (?, 'cancelled', ?, ?)`,
        [cleanCode, `Hủy đơn: ${String(reason).slice(0, 200)}. Đã hoàn lại tồn kho`, now]
      )
    })

    return res.json({
      ok: true,
      message: 'Hủy đơn hàng thành công. Số lượng sản phẩm đã được hoàn lại vào kho.',
      orderCode: cleanCode,
      status: 'cancelled',
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

const withDetails = (o) => ({
  ...o,
  items: queryAll('SELECT * FROM order_items WHERE order_code = ?', [o.code]),
  timeline: queryAll('SELECT * FROM order_history WHERE order_code = ? ORDER BY created_at ASC, id ASC', [o.code]),
})

/**
 * LUỒNG 3: Lấy danh sách đơn hàng của người dùng đăng nhập
 */
export function getMyOrders(req, res) {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ ok: false, error: 'Yêu cầu đăng nhập tài khoản' })
    }

    const orders = queryAll(`SELECT * FROM orders WHERE user_email = ? OR customer_email = ? ORDER BY created_at DESC`, [
      req.user.email,
      req.user.email,
    ]).map(withDetails)

    return res.json({ ok: true, count: orders.length, data: orders })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Cập nhật trạng thái đơn hàng (Admin)
 */
export function updateOrderStatus(req, res) {
  try {
    const cleanCode = normalizeCode(req.params.code)
    const { status, note } = req.body ?? {}

    if (!(status in STATUS_HINTS)) {
      return res.status(400).json({ ok: false, error: 'Trạng thái không hợp lệ' })
    }

    const order = queryOne('SELECT * FROM orders WHERE code = ?', [cleanCode])
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy đơn hàng' })
    }
    if (!NEXT_STATUS[order.status].includes(status)) {
      return res.status(400).json({ ok: false, error: `Không thể chuyển đơn từ "${order.status}" sang "${status}"` })
    }

    const now = new Date().toISOString()
    transaction(() => {
      if (status === 'cancelled') restock(cleanCode)
      // Đơn COD được tính là đã thanh toán khi giao thành công
      const isPaid = status === 'delivered' ? 1 : order.is_paid
      run('UPDATE orders SET status = ?, is_paid = ?, updated_at = ? WHERE code = ?', [status, isPaid, now, cleanCode])
      run(`INSERT INTO order_history (order_code, status, note, created_at) VALUES (?, ?, ?, ?)`, [
        cleanCode,
        status,
        note || STATUS_HINTS[status],
        now,
      ])
    })

    return res.json({ ok: true, message: `Cập nhật trạng thái đơn ${cleanCode} thành ${status}` })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Danh sách toàn bộ đơn hàng (Admin/API Key)
 */
export function getAllOrders(req, res) {
  try {
    const { status, search } = req.query
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
    const page = Math.max(1, Number(req.query.page) || 1)

    let sql = 'SELECT * FROM orders WHERE 1=1'
    const params = []
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }
    if (search) {
      sql += ' AND (code LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)'
      const term = `%${search}%`
      params.push(term, term, term)
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, (page - 1) * limit)

    const orders = queryAll(sql, params).map(withDetails)
    return res.json({ ok: true, count: orders.length, data: orders })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}
