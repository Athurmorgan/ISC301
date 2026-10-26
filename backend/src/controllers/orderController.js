import { queryAll, queryOne, run, transaction } from '../db.js'

const CONDITION_FACTORS = {
  seal: 1.0,
  likenew: 0.8,
  used: 0.6,
}

function generateOrderCode() {
  const chars = '0123456789'
  let result = 'BW-'
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

/**
 * Kiểm tra và áp dụng mã giảm giá
 */
export function applyCoupon(req, res) {
  try {
    const { code, subtotal = 0 } = req.body
    if (!code) {
      return res.status(400).json({ ok: false, error: 'Vui lòng nhập mã giảm giá' })
    }

    const coupon = queryOne('SELECT * FROM coupons WHERE code = ? AND active = 1', [code.trim().toUpperCase()])
    if (!coupon) {
      return res.status(404).json({ ok: false, error: 'Mã giảm giá không tồn tại hoặc đã hết hạn' })
    }

    if (subtotal < coupon.min_subtotal) {
      return res.status(400).json({
        ok: false,
        error: `Mã ${coupon.code} chỉ áp dụng cho đơn hàng từ ${coupon.min_subtotal.toLocaleString('vi-VN')}đ`,
      })
    }

    let discount = 0
    let shippingDiscount = 0

    if (coupon.kind === 'fixed') {
      discount = coupon.value
    } else if (coupon.kind === 'percent') {
      discount = Math.round((subtotal * coupon.value) / 100)
      if (coupon.cap) discount = Math.min(discount, coupon.cap)
    } else if (coupon.kind === 'shipping') {
      shippingDiscount = coupon.value
    }

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
    const { items = [], shippingId = 'standard', couponCodes = [] } = req.body

    let subtotal = 0
    const lines = []

    for (const item of items) {
      const book = queryOne('SELECT * FROM books WHERE id = ?', [item.bookId])
      if (!book) continue

      const factor = CONDITION_FACTORS[item.condition] || 1
      const unitPrice = Math.round((book.deal_price || book.price) * factor)
      const qty = Math.max(1, Number(item.qty || 1))
      const lineTotal = unitPrice * qty
      subtotal += lineTotal

      lines.push({
        bookId: book.id,
        title: book.title,
        author: book.author,
        cover: book.cover,
        category: book.category,
        condition: item.condition || 'seal',
        unitPrice,
        qty,
        lineTotal,
      })
    }

    // Tính phí vận chuyển
    const shipping = queryOne('SELECT * FROM shipping_methods WHERE id = ?', [shippingId]) || {
      id: 'standard',
      name: 'Giao tiêu chuẩn',
      fee: 15000,
    }

    let discount = 0
    let shippingDiscount = 0
    const appliedCoupons = []

    for (const code of couponCodes) {
      const coupon = queryOne('SELECT * FROM coupons WHERE code = ? AND active = 1', [code.trim().toUpperCase()])
      if (coupon && subtotal >= coupon.min_subtotal) {
        if (coupon.kind === 'fixed') {
          discount += coupon.value
        } else if (coupon.kind === 'percent') {
          let d = Math.round((subtotal * coupon.value) / 100)
          if (coupon.cap) d = Math.min(d, coupon.cap)
          discount += d
        } else if (coupon.kind === 'shipping') {
          shippingDiscount += Math.min(coupon.value, shipping.fee)
        }
        appliedCoupons.push(coupon)
      }
    }

    const finalShippingFee = Math.max(0, shipping.fee - shippingDiscount)
    const grandTotal = Math.max(0, subtotal - discount + finalShippingFee)

    return res.json({
      ok: true,
      data: {
        lines,
        itemCount: lines.reduce((acc, l) => acc + l.qty, 0),
        subtotal,
        discount,
        shippingFee: shipping.fee,
        shippingDiscount,
        finalShippingFee,
        total: grandTotal,
        appliedCoupons,
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Đặt hàng (Transaction Checkout)
 * - Kiểm tra & trừ tồn kho an toàn (reserve stock)
 * - Tạo đơn hàng, chi tiết đơn hàng, lịch sử khởi tạo
 */
export function placeOrder(req, res) {
  try {
    const {
      customer,
      items = [],
      shippingId = 'standard',
      paymentId = 'cod',
      couponCodes = [],
      note = '',
    } = req.body

    if (!customer || !customer.name || !customer.phone || !customer.province || !customer.district || !customer.street) {
      return res.status(400).json({ ok: false, error: 'Vui lòng cung cấp đầy đủ thông tin người nhận và địa chỉ' })
    }

    if (!items.length) {
      return res.status(400).json({ ok: false, error: 'Giỏ hàng đang trống' })
    }

    const shipping = queryOne('SELECT * FROM shipping_methods WHERE id = ?', [shippingId])
    if (!shipping) {
      return res.status(400).json({ ok: false, error: 'Phương thức giao hàng không hợp lệ' })
    }

    // Kiểm tra tỉnh thành nếu là hình thức Hỏa tốc
    if (shipping.provinces_json) {
      const allowed = JSON.parse(shipping.provinces_json)
      if (!allowed.includes(customer.province)) {
        return res.status(400).json({
          ok: false,
          error: `${shipping.name} chỉ áp dụng tại ${allowed.join(' và ')}`,
        })
      }
    }

    // Thực hiện đặt hàng trong transaction
    const newOrder = transaction(() => {
      // 1. Kiểm tra tồn kho & tính toán đơn giá
      let subtotal = 0
      const processedItems = []

      for (const item of items) {
        const book = queryOne('SELECT * FROM books WHERE id = ?', [item.bookId])
        if (!book) {
          throw new Error(`Sách mã ${item.bookId} không tồn tại`)
        }

        const qty = Math.max(1, Number(item.qty || 1))
        // Chỉ kiểm tra tồn kho nghiêm ngặt với sách mới (seal)
        if (item.condition === 'seal' && book.stock < qty) {
          throw new Error(`Sách "${book.title}" chỉ còn ${book.stock} cuốn trong kho`)
        }

        const factor = CONDITION_FACTORS[item.condition] || 1
        const unitPrice = Math.round((book.deal_price || book.price) * factor)
        subtotal += unitPrice * qty

        // Trừ kho và tăng số lượng bán
        run('UPDATE books SET stock = MAX(0, stock - ?), sold = sold + ? WHERE id = ?', [qty, qty, book.id])

        processedItems.push({
          bookId: book.id,
          title: book.title,
          author: book.author,
          cover: book.cover,
          category: book.category,
          condition: item.condition || 'seal',
          unitPrice,
          qty,
        })
      }

      // 2. Tính giảm giá
      let discount = 0
      let shippingDiscount = 0
      for (const code of couponCodes) {
        const coupon = queryOne('SELECT * FROM coupons WHERE code = ? AND active = 1', [code.trim().toUpperCase()])
        if (coupon && subtotal >= coupon.min_subtotal) {
          if (coupon.kind === 'fixed') {
            discount += coupon.value
          } else if (coupon.kind === 'percent') {
            let d = Math.round((subtotal * coupon.value) / 100)
            if (coupon.cap) d = Math.min(d, coupon.cap)
            discount += d
          } else if (coupon.kind === 'shipping') {
            shippingDiscount += Math.min(coupon.value, shipping.fee)
          }
        }
      }

      const total = Math.max(0, subtotal - discount + Math.max(0, shipping.fee - shippingDiscount))

      // 3. Sinh mã đơn hàng duy nhất
      let orderCode = generateOrderCode()
      while (queryOne('SELECT code FROM orders WHERE code = ?', [orderCode])) {
        orderCode = generateOrderCode()
      }

      const paymentMap = {
        vietqr: 'Chuyển khoản VietQR',
        ewallet: 'Ví MoMo / ZaloPay',
        card: 'Thẻ ATM / Visa / Mastercard',
        cod: 'Thanh toán khi nhận hàng (COD)',
      }
      const paymentName = paymentMap[paymentId] || 'Thanh toán khi nhận hàng (COD)'
      const isPaid = paymentId !== 'cod' ? 1 : 0
      const now = new Date().toISOString()
      const userEmail = req.user ? req.user.email : customer.email || null

      // 4. Lưu vào bảng orders
      run(
        `INSERT INTO orders (
          code, user_email, customer_name, customer_phone, customer_email,
          customer_province, customer_district, customer_street, note,
          shipping_id, shipping_name, shipping_fee, payment_id, payment_name, is_paid,
          subtotal, discount, shipping_discount, total, status, eta, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          orderCode,
          userEmail,
          customer.name.trim(),
          customer.phone.trim(),
          customer.email ? customer.email.trim() : '',
          customer.province,
          customer.district,
          customer.street.trim(),
          note.trim(),
          shipping.id,
          shipping.name,
          shipping.fee,
          paymentId,
          paymentName,
          isPaid,
          subtotal,
          discount,
          shippingDiscount,
          total,
          shipping.eta,
          now,
          now,
        ]
      )

      // 5. Lưu order_items
      for (const it of processedItems) {
        run(
          `INSERT INTO order_items (order_code, book_id, title, author, cover, category, condition, unit_price, qty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderCode, it.bookId, it.title, it.author, it.cover, it.category, it.condition, it.unitPrice, it.qty]
        )
      }

      // 6. Ghi lịch sử khởi tạo đơn hàng
      const initialNote = isPaid
        ? 'Đã nhận thanh toán trực tuyến, BookWise đang chuẩn bị hàng'
        : 'Đơn hàng COD đã ghi nhận, chờ xác nhận giao hàng'
      run(
        `INSERT INTO order_history (order_code, status, note, created_at)
         VALUES (?, 'pending', ?, ?)`,
        [orderCode, initialNote, now]
      )

      return {
        orderCode,
        total,
        paymentId,
        paymentName,
        isPaid,
        items: processedItems,
      }
    })

    return res.status(201).json({
      ok: true,
      message: 'Đặt hàng thành công!',
      data: newOrder,
    })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message })
  }
}

/**
 * Giả lập và xác thực thanh toán (VietQR, Thẻ OTP, Ví điện tử)
 */
export function processPayment(req, res) {
  try {
    const { orderCode, paymentMethod, cardDetails, otp } = req.body
    if (!orderCode) {
      return res.status(400).json({ ok: false, error: 'Thiếu mã đơn hàng' })
    }

    const order = queryOne('SELECT * FROM orders WHERE code = ?', [orderCode.trim().toUpperCase()])
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy đơn hàng' })
    }

    if (paymentMethod === 'vietqr') {
      // Trả về thông tin sinh mã QR thanh toán ngân hàng
      return res.json({
        ok: true,
        method: 'vietqr',
        qrData: {
          bank: 'MB Bank',
          bin: '970422',
          accountNumber: '0123456789',
          accountName: 'BOOKWISE STORE',
          amount: order.total,
          content: `THANH TOAN ${order.code}`,
          qrUrl: `https://img.vietqr.io/image/970422-0123456789-compact2.png?amount=${order.total}&addInfo=THANH%20TOAN%20${order.code}&accountName=BOOKWISE%20STORE`,
        },
      })
    }

    if (paymentMethod === 'card') {
      if (otp && otp !== '123456') {
        return res.status(400).json({ ok: false, error: 'Mã OTP không chính xác (mã thử nghiệm: 123456)' })
      }
    }

    // Đánh dấu đơn đã thanh toán
    const now = new Date().toISOString()
    run('UPDATE orders SET is_paid = 1, updated_at = ? WHERE code = ?', [now, order.code])
    run(
      `INSERT INTO order_history (order_code, status, note, created_at)
       VALUES (?, ?, 'Xác nhận thanh toán thành công qua cổng thanh toán', ?)`,
      [order.code, order.status, now]
    )

    return res.json({
      ok: true,
      message: 'Xác thực thanh toán thành công!',
      orderCode: order.code,
      isPaid: true,
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * LUỒNG 3: Tra cứu & Theo dõi đơn hàng bằng mã đơn (Public Tracking)
 */
export function trackOrder(req, res) {
  try {
    const { code } = req.params
    const cleanCode = code.trim().toUpperCase()

    const order = queryOne('SELECT * FROM orders WHERE code = ?', [cleanCode])
    if (!order) {
      return res.status(404).json({ ok: false, error: `Không tìm thấy đơn hàng có mã ${cleanCode}` })
    }

    const items = queryAll('SELECT * FROM order_items WHERE order_code = ?', [cleanCode])
    const timeline = queryAll('SELECT * FROM order_history WHERE order_code = ? ORDER BY created_at ASC', [cleanCode])

    // Tra cứu thêm thông tin vận chuyển nếu có
    let shipment = null
    let checkpoints = []
    if (order.tracking_code) {
      shipment = queryOne('SELECT * FROM delivery_shipments WHERE tracking_code = ?', [order.tracking_code])
      if (shipment) {
        checkpoints = queryAll('SELECT * FROM delivery_checkpoints WHERE shipment_id = ? ORDER BY event_time ASC', [shipment.id])
      }
    }

    return res.json({
      ok: true,
      data: {
        order,
        items,
        timeline,
        logistics: shipment
          ? {
              carrier: shipment.carrier_name,
              trackingCode: shipment.tracking_code,
              shipperName: shipment.shipper_name,
              shipperPhone: shipment.shipper_phone,
              currentStatus: shipment.current_status,
              destination: shipment.destination,
              checkpoints,
            }
          : null,
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * LUỒNG 3: Tra cứu danh sách đơn hàng bằng SĐT hoặc Email (không cần login)
 */
export function lookupOrders(req, res) {
  try {
    const { phone, email } = req.body
    if (!phone && !email) {
      return res.status(400).json({ ok: false, error: 'Vui lòng cung cấp Số điện thoại hoặc Email để tra cứu' })
    }

    let sql = 'SELECT code, customer_name, customer_phone, total, status, created_at, tracking_carrier, tracking_code FROM orders WHERE 1=0'
    const params = []

    if (phone) {
      sql += ' OR customer_phone = ?'
      params.push(phone.trim())
    }
    if (email) {
      sql += ' OR customer_email = ?'
      params.push(email.trim().toLowerCase())
    }

    sql += ' ORDER BY created_at DESC'
    const orders = queryAll(sql, params)

    return res.json({
      ok: true,
      count: orders.length,
      data: orders,
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * LUỒNG 3: Khách hàng tự huỷ đơn nếu đơn đang ở trạng thái 'pending'
 * Tự động hoàn lại tồn kho đã reserve!
 */
export function cancelOrder(req, res) {
  try {
    const { code } = req.params
    const { reason = 'Khách hàng yêu cầu hủy đơn' } = req.body
    const cleanCode = code.trim().toUpperCase()

    const order = queryOne('SELECT * FROM orders WHERE code = ?', [cleanCode])
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy đơn hàng' })
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        ok: false,
        error: `Không thể hủy đơn hàng đang ở trạng thái "${order.status}". Vui lòng liên hệ CSKH để được trợ giúp.`,
      })
    }

    const now = new Date().toISOString()

    transaction(() => {
      // 1. Hoàn lại số lượng sách vào kho
      const items = queryAll('SELECT book_id, qty FROM order_items WHERE order_code = ?', [cleanCode])
      for (const it of items) {
        run('UPDATE books SET stock = stock + ?, sold = MAX(0, sold - ?) WHERE id = ?', [it.qty, it.qty, it.book_id])
      }

      // 2. Đổi trạng thái đơn thành cancelled
      run('UPDATE orders SET status = ?, updated_at = ? WHERE code = ?', ['cancelled', now, cleanCode])

      // 3. Ghi vào lịch sử
      run(
        `INSERT INTO order_history (order_code, status, note, created_at)
         VALUES (?, 'cancelled', ?, ?)`,
        [cleanCode, `Hủy đơn: ${reason}. Đã hoàn lại tồn kho`, now]
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

/**
 * LUỒNG 3: Lấy danh sách đơn hàng của người dùng đăng nhập
 */
export function getMyOrders(req, res) {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ ok: false, error: 'Yêu cầu đăng nhập tài khoản' })
    }

    const orders = queryAll(
      `SELECT * FROM orders WHERE user_email = ? OR customer_email = ? ORDER BY created_at DESC`,
      [req.user.email, req.user.email]
    )

    const fullOrders = orders.map((o) => {
      const items = queryAll('SELECT * FROM order_items WHERE order_code = ?', [o.code])
      return { ...o, items }
    })

    return res.json({ ok: true, count: fullOrders.length, data: fullOrders })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Cập nhật trạng thái đơn hàng (Dành cho Admin hoặc Shipper)
 */
export function updateOrderStatus(req, res) {
  try {
    const { code } = req.params
    const { status, note } = req.body
    const cleanCode = code.trim().toUpperCase()

    const order = queryOne('SELECT * FROM orders WHERE code = ?', [cleanCode])
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy đơn hàng' })
    }

    if (order.status === 'cancelled' || order.status === 'delivered') {
      return res.status(400).json({ ok: false, error: 'Đơn hàng đã kết thúc, không thể thay đổi trạng thái' })
    }

    const statusHints = {
      pending: 'Chờ xác nhận tồn kho',
      confirmed: 'Sách đã qua kiểm định và được đóng gói',
      shipping: 'Đơn vị vận chuyển đang giao sách đến bạn',
      delivered: 'Bạn đã nhận được sách',
      cancelled: 'Đơn hàng đã bị huỷ',
    }

    const now = new Date().toISOString()
    const historyNote = note || statusHints[status] || `Cập nhật trạng thái sang ${status}`

    transaction(() => {
      // Nếu huỷ đơn thì hoàn kho
      if (status === 'cancelled') {
        const items = queryAll('SELECT book_id, qty FROM order_items WHERE order_code = ?', [cleanCode])
        for (const it of items) {
          run('UPDATE books SET stock = stock + ?, sold = MAX(0, sold - ?) WHERE id = ?', [it.qty, it.qty, it.book_id])
        }
      }

      // Đơn COD thành công thì đánh dấu đã trả tiền
      const isPaid = status === 'delivered' ? 1 : order.is_paid

      run('UPDATE orders SET status = ?, is_paid = ?, updated_at = ? WHERE code = ?', [status, isPaid, now, cleanCode])
      run(
        `INSERT INTO order_history (order_code, status, note, created_at)
         VALUES (?, ?, ?, ?)`,
        [cleanCode, status, historyNote, now]
      )
    })

    return res.json({
      ok: true,
      message: `Cập nhật trạng thái đơn ${cleanCode} thành ${status}`,
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Danh sách toàn bộ đơn hàng (Admin/API Key)
 */
export function getAllOrders(req, res) {
  try {
    const { status, search, limit = 50, page = 1 } = req.query
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

    sql += ' ORDER BY created_at DESC'

    const numLimit = Number(limit)
    const offset = (Number(page) - 1) * numLimit
    sql += ' LIMIT ? OFFSET ?'
    params.push(numLimit, offset)

    const orders = queryAll(sql, params)
    const formatted = orders.map((o) => {
      const items = queryAll('SELECT * FROM order_items WHERE order_code = ?', [o.code])
      return { ...o, items }
    })

    return res.json({ ok: true, count: formatted.length, data: formatted })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}
