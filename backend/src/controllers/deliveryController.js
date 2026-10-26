import { queryAll, queryOne, run, transaction } from '../db.js'
import { uniqueCode } from '../lib/codes.js'
import { maskOrder } from '../lib/privacy.js'
import { isStaff } from '../middleware/auth.js'

function generateTrackingCode(carrier) {
  const name = carrier.toLowerCase()
  const prefix = name.includes('aha') ? 'AHA-BW' : name.includes('ghn') ? 'GHN-VN' : name.includes('viettel') ? 'VTP-BW' : 'SHIP'
  return uniqueCode(prefix, 6, 'delivery_shipments', 'tracking_code')
}

/**
 * Lấy danh sách phương thức giao hàng
 */
export function getShippingMethods(req, res) {
  try {
    const methods = queryAll('SELECT * FROM shipping_methods')
    const formatted = methods.map((m) => ({
      ...m,
      provinces: m.provinces_json ? JSON.parse(m.provinces_json) : null,
    }))
    return res.json({ ok: true, data: formatted })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Danh sách đối tác vận chuyển tích hợp
 */
export function getCarriers(req, res) {
  return res.json({
    ok: true,
    data: [
      {
        id: 'ahamove',
        name: 'AhaMove',
        service: 'Hỏa tốc 2 giờ nội thành',
        coverage: ['Hà Nội', 'TP. Hồ Chí Minh'],
        hotline: '1900 545411',
        standardFee: 30000,
      },
      {
        id: 'ghn',
        name: 'Giao Hàng Nhanh (GHN)',
        service: 'Chuyển phát nhanh liên tỉnh 2-3 ngày',
        coverage: ['Toàn quốc (63 tỉnh thành)'],
        hotline: '1900 636677',
        standardFee: 15000,
      },
      {
        id: 'viettelpost',
        name: 'Viettel Post',
        service: 'Bưu chính Viettel tiêu chuẩn',
        coverage: ['Toàn quốc'],
        hotline: '1900 8095',
        standardFee: 15000,
      },
    ],
  })
}

/**
 * Tra cứu hành trình vận đơn bằng mã vận đơn (trackingCode)
 */
export function getTracking(req, res) {
  try {
    const { trackingCode } = req.params
    const shipment = queryOne('SELECT * FROM delivery_shipments WHERE tracking_code = ?', [trackingCode.trim().toUpperCase()])

    if (!shipment) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy thông tin vận đơn' })
    }

    const checkpoints = queryAll(
      'SELECT * FROM delivery_checkpoints WHERE shipment_id = ? ORDER BY event_time ASC',
      [shipment.id]
    )

    // Lấy thông tin đơn hàng đi kèm
    const order = queryOne(
      'SELECT code, status, customer_name, customer_phone, customer_province, customer_district, customer_street, total FROM orders WHERE code = ?',
      [shipment.order_code]
    )

    // Mã vận đơn in trên kiện hàng nên ai cũng có thể thấy: chỉ trả địa chỉ, SĐT đầy đủ cho quản trị/đối tác
    const staff = isStaff(req.user)
    return res.json({
      ok: true,
      data: {
        shipment: staff ? shipment : { ...shipment, destination: order?.customer_province ?? '***', shipper_phone: null },
        checkpoints,
        order: staff || !order ? order : maskOrder(order),
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Xuất kho và tạo vận đơn vận chuyển cho đơn hàng
 */
export function dispatchShipment(req, res) {
  try {
    const { orderCode, carrierName, shipperName, shipperPhone, destination, eta, originHub } = req.body
    if (!orderCode || !carrierName) {
      return res.status(400).json({ ok: false, error: 'Vui lòng cung cấp mã đơn hàng và đối tác vận chuyển' })
    }

    const cleanOrderCode = orderCode.trim().toUpperCase()
    const order = queryOne('SELECT * FROM orders WHERE code = ?', [cleanOrderCode])
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy đơn hàng' })
    }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return res.status(400).json({ ok: false, error: `Đơn hàng đang ở trạng thái "${order.status}", không thể tạo vận đơn mới` })
    }

    const trackingCode = generateTrackingCode(carrierName)
    const now = new Date().toISOString()
    const finalDest = destination || `${order.customer_street}, ${order.customer_district}, ${order.customer_province}`

    const result = transaction(() => {
      // 1. Tạo vận đơn
      run(
        `INSERT INTO delivery_shipments (
          tracking_code, order_code, carrier_name, shipper_name, shipper_phone, origin_hub, destination,
          current_status, eta, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ready_to_ship', ?, ?, ?, ?)`,
        [
          trackingCode,
          cleanOrderCode,
          carrierName,
          shipperName || 'Đang điều phối bưu tá',
          shipperPhone || null,
          originHub || 'Kho Tổng BookWise',
          finalDest,
          eta || 'Trong ngày',
          'Kiện hàng đã xuất kho đóng gói',
          now,
          now,
        ]
      )

      const shipment = queryOne('SELECT * FROM delivery_shipments WHERE tracking_code = ?', [trackingCode])

      // 2. Tạo trạm kiểm soát đầu tiên (Checkpoint)
      run(
        `INSERT INTO delivery_checkpoints (shipment_id, location, status_text, description, event_time)
         VALUES (?, ?, ?, ?, ?)`,
        [shipment.id, originHub || 'Kho Tổng BookWise', 'Đã tạo vận đơn', 'Kiện hàng hoàn tất đóng gói, chờ bưu tá đến lấy', now]
      )

      // 3. Cập nhật mã vận đơn và trạng thái trong bảng orders
      run(
        `UPDATE orders
         SET tracking_carrier = ?, tracking_code = ?, status = 'shipping', updated_at = ?
         WHERE code = ?`,
        [carrierName, trackingCode, now, cleanOrderCode]
      )

      // 4. Ghi lịch sử đơn hàng
      run(
        `INSERT INTO order_history (order_code, status, note, created_at)
         VALUES (?, 'shipping', ?, ?)`,
        [cleanOrderCode, `Bàn giao ĐVVC ${carrierName}. Mã vận đơn: ${trackingCode}`, now]
      )

      return shipment
    })

    return res.status(201).json({
      ok: true,
      message: 'Tạo vận đơn và xuất kho thành công',
      data: result,
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Webhook hoặc Quản trị cập nhật trạng thái vận đơn & trạm kiểm soát (Checkpoints)
 * Đồng thời tự động đồng bộ sang trạng thái Đơn hàng!
 */
export function updateTrackingStatus(req, res) {
  try {
    const { trackingCode, status, location, description, shipperName, shipperPhone } = req.body
    if (!trackingCode || !status) {
      return res.status(400).json({ ok: false, error: 'Thiếu trackingCode hoặc status' })
    }

    const cleanTrackingCode = trackingCode.trim().toUpperCase()
    const shipment = queryOne('SELECT * FROM delivery_shipments WHERE tracking_code = ?', [cleanTrackingCode])
    if (!shipment) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy vận đơn' })
    }

    const now = new Date().toISOString()

    transaction(() => {
      // 1. Cập nhật shipment
      run(
        `UPDATE delivery_shipments
         SET current_status = ?, shipper_name = COALESCE(?, shipper_name),
             shipper_phone = COALESCE(?, shipper_phone), updated_at = ?
         WHERE id = ?`,
        [status, shipperName || null, shipperPhone || null, now, shipment.id]
      )

      // 2. Thêm checkpoint
      run(
        `INSERT INTO delivery_checkpoints (shipment_id, location, status_text, description, event_time)
         VALUES (?, ?, ?, ?, ?)`,
        [shipment.id, location || 'Trạm trung chuyển', status, description || `Cập nhật trạng thái: ${status}`, now]
      )

      // 3. Tự động đồng bộ với trạng thái đơn hàng khi giao thành công (bỏ qua nếu đơn đã kết thúc)
      const order = queryOne('SELECT status FROM orders WHERE code = ?', [shipment.order_code])
      if (status === 'delivered' && order?.status === 'shipping') {
        run(
          `UPDATE orders SET status = 'delivered', is_paid = 1, updated_at = ? WHERE code = ?`,
          [now, shipment.order_code]
        )
        run(
          `INSERT INTO order_history (order_code, status, note, created_at)
           VALUES (?, 'delivered', ?, ?)`,
          [shipment.order_code, 'Khách hàng đã nhận hàng thành công từ đối tác vận chuyển', now]
        )
      }
    })

    const updatedShipment = queryOne('SELECT * FROM delivery_shipments WHERE id = ?', [shipment.id])
    const checkpoints = queryAll('SELECT * FROM delivery_checkpoints WHERE shipment_id = ? ORDER BY event_time ASC', [shipment.id])

    return res.json({
      ok: true,
      message: 'Cập nhật trạng thái giao hàng thành công',
      data: {
        shipment: updatedShipment,
        checkpoints,
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}
