import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, run, transaction } from './db.js'
import { refreshBook, storeListingId } from './lib/listings.js'
import { hashPassword } from './lib/password.js'
import { BOOKWISE_SELLER, storePrice } from './lib/pricing.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load data từ frontend source
const { CATEGORIES, COUPONS, SHIPPING, DEMO_SELLER } = await import('../../src/data/catalog.ts')
const { SEED_BOOKS } = await import('../../src/data/books.ts')
const { FAQS } = await import('../../src/data/faq.ts')

export function seed({ exportJson = true } = {}) {
  console.log('🌱 Bắt đầu nạp dữ liệu mẫu vào BookWise Database...')

  transaction(() => {
    // 1. Xóa dữ liệu cũ để tránh trùng lặp
    db.exec(`
      DELETE FROM listings;
      DELETE FROM seller_history;
      DELETE FROM seller_applications;
      DELETE FROM delivery_checkpoints;
      DELETE FROM delivery_shipments;
      DELETE FROM order_history;
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM buyback_history;
      DELETE FROM buyback_requests;
      DELETE FROM book_reviews;
      DELETE FROM support_tickets;
      DELETE FROM support_faqs;
      DELETE FROM shipping_methods;
      DELETE FROM coupons;
      DELETE FROM books;
      DELETE FROM categories;
      DELETE FROM users;
      DELETE FROM api_keys;
    `)

    // 2. API Key không nạp sẵn: cấu hình ADMIN_API_KEY / PARTNER_API_KEY / PUBLIC_API_KEY trong .env
    //    hoặc thêm dòng vào bảng api_keys khi cần cấp key riêng cho từng đối tác.
    const now = new Date().toISOString()

    // 3. Nạp Tài khoản người dùng (Admin & Khách hàng mẫu)
    const users = [
      {
        email: 'admin@bookwise.vn',
        name: 'Quản trị viên BookWise',
        phone: '0901234567',
        password: 'admin123',
        role: 'admin',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        street: '123 Nguyễn Huệ',
      },
      {
        email: 'nguyenvanan@gmail.com',
        name: 'Nguyễn Văn An',
        phone: '0903123456',
        password: 'customer123',
        role: 'customer',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        street: '12 Lê Lợi',
      },
      {
        email: 'tranthib@gmail.com',
        name: 'Trần Thị Bích',
        phone: '0987654321',
        password: 'customer123',
        role: 'customer',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        street: '45 Xuân Thủy',
      },
      {
        email: 'lehoangnam@gmail.com',
        name: 'Lê Hoàng Nam',
        phone: '0918776655',
        password: 'customer123',
        role: 'customer',
        province: 'Đà Nẵng',
        district: 'Hải Châu',
        street: '78 Nguyễn Văn Linh',
      },
      {
        email: DEMO_SELLER.email,
        name: DEMO_SELLER.name,
        phone: DEMO_SELLER.phone,
        password: DEMO_SELLER.password,
        role: 'customer',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 10',
        street: 'KTX 135B Trần Hưng Đạo',
      },
    ]

    for (const u of users) {
      run(
        `INSERT INTO users (email, name, phone, password_hash, role, province, district, street, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.email, u.name, u.phone, hashPassword(u.password), u.role, u.province, u.district, u.street, now]
      )
    }

    // 4. Nạp Danh mục sách
    for (const c of CATEGORIES) {
      run(
        `INSERT INTO categories (id, name, blurb) VALUES (?, ?, ?)`,
        [c.id, c.name, c.blurb]
      )
    }

    // 5. Nạp 49 Đầu Sách
    for (const b of SEED_BOOKS) {
      run(
        `INSERT INTO books (
          id, title, original_title, original_language, author, publisher, category, cover,
          price, list_price, deal_price, stock, sold, rating, rating_count, pages, first_published,
          description, staff_pick, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          b.id, b.title, b.originalTitle || null, b.originalLanguage || null, b.author,
          b.publisher || null, b.category, b.cover, b.price, b.listPrice, b.dealPrice || null,
          b.stock, b.sold, b.rating, b.ratingCount, b.pages || 250, b.firstPublished || null,
          b.description || '', b.staffPick || null, now
        ]
      )
    }

    // 6. Nạp Mã giảm giá (Coupons)
    for (const cp of COUPONS) {
      run(
        `INSERT INTO coupons (code, kind, value, cap, min_subtotal, description, active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [cp.code, cp.kind, cp.value, cp.cap || null, cp.minSubtotal, cp.description]
      )
    }

    // 7. Nạp Phương thức giao hàng
    for (const s of SHIPPING) {
      run(
        `INSERT INTO shipping_methods (id, name, fee, eta, carrier, provinces_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [s.id, s.name, s.fee, s.eta, s.carrier, s.provinces ? JSON.stringify(s.provinces) : null]
      )
    }

    // 8. Nạp FAQs
    let faqSort = 1
    for (const f of FAQS) {
      run(
        `INSERT INTO support_faqs (category, question, answer, sort_order)
         VALUES (?, ?, ?, ?)`,
        [f.group, f.q, f.a, faqSort++]
      )
    }

    // 9. Nạp Đơn hàng mẫu (Orders, Items, Timeline, Shipments, Checkpoints)
    const sampleOrders = [
      {
        code: 'BW-100234',
        userEmail: 'nguyenvanan@gmail.com',
        customer: {
          name: 'Nguyễn Văn An',
          phone: '0903123456',
          email: 'nguyenvanan@gmail.com',
          province: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
          street: '12 Lê Lợi',
        },
        note: 'Giao trong giờ hành chính, gọi trước 15 phút',
        shippingId: 'express',
        shippingName: 'Hỏa tốc 2 giờ',
        shippingFee: 30000,
        paymentId: 'vietqr',
        paymentName: 'Chuyển khoản VietQR',
        isPaid: 1,
        subtotal: 214000,
        discount: 0,
        shippingDiscount: 15000,
        total: 229000,
        status: 'delivered',
        trackingCarrier: 'AhaMove',
        trackingCode: 'AHA-BW-100234',
        eta: 'Đã hoàn thành',
        createdAt: '2026-10-25T09:15:00.000Z',
        updatedAt: '2026-10-25T11:20:00.000Z',
        items: [
          {
            bookId: 'tam-ly-hoc-ve-tien',
            title: 'Tâm lý học về tiền',
            author: 'Morgan Housel',
            cover: '/covers/tam-ly-hoc-ve-tien.jpg',
            category: 'kinh-te',
            condition: 'likenew',
            unitPrice: 116000,
            qty: 1,
          },
          {
            bookId: 'cha-giau-cha-ngheo',
            title: 'Cha giàu, cha nghèo',
            author: 'Robert T. Kiyosaki',
            cover: '/covers/cha-giau-cha-ngheo.jpg',
            category: 'kinh-te',
            condition: 'likenew',
            unitPrice: 98000,
            qty: 1,
          },
        ],
        history: [
          { status: 'pending', note: 'Đơn hàng được khởi tạo thành công qua VietQR', at: '2026-10-25T09:15:00.000Z' },
          { status: 'confirmed', note: 'Đã nhận thanh toán 229.000đ. Kho hoàn tất kiểm định và đóng gói sách', at: '2026-10-25T09:20:00.000Z' },
          { status: 'shipping', note: 'Bàn giao cho shipper AhaMove (Trần Quốc Bảo - 0988112233)', at: '2026-10-25T10:00:00.000Z' },
          { status: 'delivered', note: 'Giao hàng thành công đến người nhận. Khách đã kiểm tra sách', at: '2026-10-25T11:20:00.000Z' },
        ],
        shipment: {
          carrier: 'AhaMove',
          shipperName: 'Trần Quốc Bảo',
          shipperPhone: '0988112233',
          origin: 'Kho Tổng BookWise - Quận 1, TP.HCM',
          destination: '12 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
          currentStatus: 'delivered',
          eta: '11:30 25/10/2026',
          checkpoints: [
            { location: 'Kho Tổng BookWise (Quận 1)', status: 'Lấy hàng thành công', desc: 'Tài xế đã nhận gói hàng nguyên vẹn', time: '2026-10-25T10:05:00.000Z' },
            { location: 'Đường Nguyễn Thị Minh Khai', status: 'Đang di chuyển', desc: 'Shipper đang trên đường tới địa chỉ khách hàng', time: '2026-10-25T10:35:00.000Z' },
            { location: '12 Lê Lợi, Quận 1', status: 'Giao thành công', desc: 'Khách hàng ký nhận bưu kiện', time: '2026-10-25T11:20:00.000Z' },
          ],
        },
      },
      {
        code: 'BW-100582',
        userEmail: 'tranthib@gmail.com',
        customer: {
          name: 'Trần Thị Bích',
          phone: '0987654321',
          email: 'tranthib@gmail.com',
          province: 'Hà Nội',
          district: 'Cầu Giấy',
          street: '45 Xuân Thủy',
        },
        note: 'Cho kiểm tra hàng trước khi nhận',
        shippingId: 'standard',
        shippingName: 'Giao tiêu chuẩn',
        shippingFee: 15000,
        paymentId: 'cod',
        paymentName: 'Thanh toán khi nhận hàng (COD)',
        isPaid: 0,
        subtotal: 378000,
        discount: 50000, // Coupon BOOKWISE50K
        shippingDiscount: 0,
        total: 343000,
        status: 'shipping',
        trackingCarrier: 'GHN (Giao Hàng Nhanh)',
        trackingCode: 'GHN-VN-100582',
        eta: 'Dự kiến hôm nay 17:00',
        createdAt: '2026-10-26T08:30:00.000Z',
        updatedAt: '2026-10-26T14:10:00.000Z',
        items: [
          {
            bookId: 'tu-duy-nhanh-va-cham',
            title: 'Tư duy nhanh và chậm',
            author: 'Daniel Kahneman',
            cover: '/covers/tu-duy-nhanh-va-cham.jpg',
            category: 'kinh-te',
            condition: 'likenew',
            unitPrice: 159000,
            qty: 1,
          },
          {
            bookId: 'nha-dau-tu-thong-minh',
            title: 'Nhà đầu tư thông minh',
            author: 'Benjamin Graham',
            cover: '/covers/nha-dau-tu-thong-minh.jpg',
            category: 'kinh-te',
            condition: 'likenew',
            unitPrice: 219000,
            qty: 1,
          },
        ],
        history: [
          { status: 'pending', note: 'Đơn hàng COD chờ xác nhận thông tin giao hàng', at: '2026-10-26T08:30:00.000Z' },
          { status: 'confirmed', note: 'Điện thoại xác nhận thành công. Đóng gói 2 cuốn sách có chống sốc', at: '2026-10-26T09:15:00.000Z' },
          { status: 'shipping', note: 'Bàn giao bưu tá GHN. Đang trên đường phát hàng khu vực Cầu Giấy', at: '2026-10-26T14:10:00.000Z' },
        ],
        shipment: {
          carrier: 'GHN',
          shipperName: 'Nguyễn Văn Tài',
          shipperPhone: '0912345678',
          origin: 'Kho Phía Bắc BookWise - Long Biên, Hà Nội',
          destination: '45 Xuân Thủy, Cầu Giấy, Hà Nội',
          currentStatus: 'delivering',
          eta: '17:00 26/10/2026',
          checkpoints: [
            { location: 'Kho Phía Bắc (Long Biên)', status: 'Xuất kho', desc: 'Đã đóng gói và niêm phong kiện hàng', time: '2026-10-26T10:00:00.000Z' },
            { location: 'Bưu cục GHN Cầu Giấy', status: 'Đến bưu cục phát', desc: 'Kiện hàng đã tới bưu cục phụ trách giao', time: '2026-10-26T13:45:00.000Z' },
            { location: 'Tuyến Cầu Giấy - Dịch Vọng', status: 'Đang phát hàng', desc: 'Shipper Nguyễn Văn Tài (0912345678) đang liên hệ giao', time: '2026-10-26T14:10:00.000Z' },
          ],
        },
      },
      {
        code: 'BW-100791',
        userEmail: 'lehoangnam@gmail.com',
        customer: {
          name: 'Lê Hoàng Nam',
          phone: '0918776655',
          email: 'lehoangnam@gmail.com',
          province: 'Đà Nẵng',
          district: 'Hải Châu',
          street: '78 Nguyễn Văn Linh',
        },
        note: 'Bọc sách cẩn thận giúp mình nhé',
        shippingId: 'standard',
        shippingName: 'Giao tiêu chuẩn',
        shippingFee: 15000,
        paymentId: 'card',
        paymentName: 'Thẻ tín dụng / Ghi nợ (Visa)',
        isPaid: 1,
        subtotal: 350000,
        discount: 0,
        shippingDiscount: 0,
        total: 365000,
        status: 'confirmed',
        trackingCarrier: 'Viettel Post',
        trackingCode: 'VTP-BW-100791',
        eta: '2–3 ngày làm việc',
        createdAt: '2026-10-26T13:40:00.000Z',
        updatedAt: '2026-10-26T14:00:00.000Z',
        items: [
          {
            bookId: 'sapiens-luoc-su-loai-nguoi',
            title: 'Sapiens: Lược sử loài người',
            author: 'Yuval Noah Harari',
            cover: '/covers/sapiens-luoc-su-loai-nguoi.jpg',
            category: 'khoa-hoc',
            condition: 'likenew',
            unitPrice: 175000,
            qty: 2,
          },
        ],
        history: [
          { status: 'pending', note: 'Thanh toán trực tuyến thẻ Visa thành công', at: '2026-10-26T13:40:00.000Z' },
          { status: 'confirmed', note: 'Bộ phận kho đã nhận đơn, đang chuẩn bị hàng', at: '2026-10-26T14:00:00.000Z' },
        ],
      },
      {
        code: 'BW-100912',
        userEmail: 'phammai@gmail.com',
        customer: {
          name: 'Phạm Thị Mai',
          phone: '0933445566',
          email: 'phammai@gmail.com',
          province: 'TP. Hồ Chí Minh',
          district: 'Bình Thạnh',
          street: '20 Điện Biên Phủ',
        },
        note: 'Giao buổi chiều sau 14h',
        shippingId: 'standard',
        shippingName: 'Giao tiêu chuẩn',
        shippingFee: 15000,
        paymentId: 'ewallet',
        paymentName: 'Ví điện tử MoMo',
        isPaid: 1,
        subtotal: 65400,
        discount: 0,
        shippingDiscount: 0,
        total: 80400,
        status: 'pending',
        trackingCarrier: null,
        trackingCode: null,
        eta: 'Dự kiến 28/10/2026',
        createdAt: '2026-10-26T14:45:00.000Z',
        updatedAt: '2026-10-26T14:45:00.000Z',
        items: [
          {
            bookId: 'khong-den-mot',
            title: 'Không đến một',
            author: 'Peter Thiel, Blake Masters',
            cover: '/covers/khong-den-mot.jpg',
            category: 'kinh-te',
            condition: 'used',
            unitPrice: 65400,
            qty: 1,
          },
        ],
        history: [
          { status: 'pending', note: 'Đơn hàng mới tạo, đã thanh toán qua MoMo, chờ duyệt xuất kho', at: '2026-10-26T14:45:00.000Z' },
        ],
      },
      {
        code: 'BW-100105',
        userEmail: 'duc.hm@gmail.com',
        customer: {
          name: 'Hoàng Minh Đức',
          phone: '0977889900',
          email: 'duc.hm@gmail.com',
          province: 'Hà Nội',
          district: 'Đống Đa',
          street: '15 Tôn Đức Thắng',
        },
        note: 'Đổi ý huỷ đơn',
        shippingId: 'standard',
        shippingName: 'Giao tiêu chuẩn',
        shippingFee: 15000,
        paymentId: 'cod',
        paymentName: 'Thanh toán khi nhận hàng (COD)',
        isPaid: 0,
        subtotal: 135000,
        discount: 0,
        shippingDiscount: 0,
        total: 150000,
        status: 'cancelled',
        trackingCarrier: null,
        trackingCode: null,
        eta: null,
        createdAt: '2026-10-24T10:00:00.000Z',
        updatedAt: '2026-10-24T10:30:00.000Z',
        items: [
          {
            bookId: 'tu-tot-den-vi-dai',
            title: 'Từ tốt đến vĩ đại',
            author: 'Jim Collins',
            cover: '/covers/tu-tot-den-vi-dai.jpg',
            category: 'kinh-te',
            condition: 'likenew',
            unitPrice: 135000,
            qty: 1,
          },
        ],
        history: [
          { status: 'pending', note: 'Đơn hàng đã đặt', at: '2026-10-24T10:00:00.000Z' },
          { status: 'cancelled', note: 'Khách hàng huỷ đơn do chọn sai địa chỉ nhận hàng. Kho đã hoàn lại tồn kho.', at: '2026-10-24T10:30:00.000Z' },
        ],
      },
    ]

    for (const ord of sampleOrders) {
      run(
        `INSERT INTO orders (
          code, user_email, customer_name, customer_phone, customer_email,
          customer_province, customer_district, customer_street, note,
          shipping_id, shipping_name, shipping_fee, payment_id, payment_name, is_paid,
          subtotal, discount, shipping_discount, total, status, tracking_carrier, tracking_code, eta,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ord.code, ord.userEmail, ord.customer.name, ord.customer.phone, ord.customer.email,
          ord.customer.province, ord.customer.district, ord.customer.street, ord.note,
          ord.shippingId, ord.shippingName, ord.shippingFee, ord.paymentId, ord.paymentName, ord.isPaid,
          ord.subtotal, ord.discount, ord.shippingDiscount, ord.total, ord.status,
          ord.trackingCarrier, ord.trackingCode, ord.eta, ord.createdAt, ord.updatedAt
        ]
      )

      for (const item of ord.items) {
        run(
          `INSERT INTO order_items (order_code, book_id, listing_id, seller_id, seller_name, title, author, cover, category, condition, unit_price, qty)
           VALUES (?, ?, ?, ?, 'BookWise', ?, ?, ?, ?, ?, ?, ?)`,
          [ord.code, item.bookId, storeListingId(item.bookId, item.condition), BOOKWISE_SELLER, item.title, item.author, item.cover, item.category, item.condition, item.unitPrice, item.qty]
        )
      }

      for (const h of ord.history) {
        run(
          `INSERT INTO order_history (order_code, status, note, created_at)
           VALUES (?, ?, ?, ?)`,
          [ord.code, h.status, h.note, h.at]
        )
      }

      if (ord.shipment) {
        run(
          `INSERT INTO delivery_shipments (
            tracking_code, order_code, carrier_name, shipper_name, shipper_phone, origin_hub, destination,
            current_status, eta, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ord.trackingCode, ord.code, ord.shipment.carrier, ord.shipment.shipperName, ord.shipment.shipperPhone,
            ord.shipment.origin, ord.shipment.destination, ord.shipment.currentStatus, ord.shipment.eta,
            'Kiện hàng đóng gói niêm phong 2 lớp', ord.createdAt, ord.updatedAt
          ]
        )

        const shipmentRow = db.prepare('SELECT id FROM delivery_shipments WHERE tracking_code = ?').all(ord.trackingCode)[0]
        if (shipmentRow && ord.shipment.checkpoints) {
          for (const cp of ord.shipment.checkpoints) {
            run(
              `INSERT INTO delivery_checkpoints (shipment_id, location, status_text, description, event_time)
               VALUES (?, ?, ?, ?, ?)`,
              [shipmentRow.id, cp.location, cp.status, cp.desc, cp.time]
            )
          }
        }
      }
    }

    // 10. Nạp Phiếu hỗ trợ khách hàng (CSKH Tickets)
    const sampleTickets = [
      {
        code: 'TK-8821',
        topic: 'order',
        name: 'Trần Thị Bích',
        email: 'tranthib@gmail.com',
        phone: '0987654321',
        orderCode: 'BW-100582',
        message: 'Đơn hàng của tôi đang ở khu vực nào rồi ạ? Khoảng mấy giờ shipper giao đến?',
        status: 'open',
        response: null,
        responderName: null,
        createdAt: '2026-10-26T14:15:00.000Z',
        resolvedAt: null,
      },
      {
        code: 'TK-7740',
        topic: 'quality',
        name: 'Nguyễn Văn An',
        email: 'nguyenvanan@gmail.com',
        phone: '0903123456',
        orderCode: 'BW-100234',
        message: 'Sách Tâm lý học về tiền bản Likenew của shop thực tế có bị ố vàng hay viết bút chì không?',
        status: 'resolved',
        response: 'Chào anh An, các đầu sách Likenew tại BookWise đều đạt độ mới trên 98%, gáy thẳng, không ghi chú viết vẽ và được kiểm định 3 bước trước khi gửi ạ!',
        responderName: 'CSKH BookWise (Hương Lan)',
        createdAt: '2026-10-24T16:00:00.000Z',
        resolvedAt: '2026-10-24T16:20:00.000Z',
      },
      {
        code: 'TK-6612',
        topic: 'payment',
        name: 'Lê Hoàng Nam',
        email: 'lehoangnam@gmail.com',
        phone: '0918776655',
        orderCode: 'BW-100791',
        message: 'Tôi thanh toán thẻ tín dụng đã trừ tiền nhưng kiểm tra trên web thấy đang xác nhận, đã nhận được tiền chưa?',
        status: 'resolved',
        response: 'Dạ chào bạn Nam, hệ thống cổng thanh toán đã ghi nhận thành công mã giao dịch thẻ của bạn. Đơn hàng BW-100791 đã chuyển sang Đã xác nhận và đang đóng gói chuyển đi ạ!',
        responderName: 'CSKH BookWise (Minh Đức)',
        createdAt: '2026-10-26T13:42:00.000Z',
        resolvedAt: '2026-10-26T13:50:00.000Z',
      },
    ]

    for (const t of sampleTickets) {
      run(
        `INSERT INTO support_tickets (code, topic, name, email, phone, order_code, message, status, response, responder_name, created_at, resolved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.code, t.topic, t.name, t.email, t.phone, t.orderCode, t.message, t.status, t.response, t.responderName, t.createdAt, t.resolvedAt]
      )
    }

    // 11. Nạp Đánh giá sách (Reviews)
    const sampleReviews = [
      {
        bookId: 'tam-ly-hoc-ve-tien',
        name: 'Nguyễn Văn An',
        email: 'nguyenvanan@gmail.com',
        rating: 5,
        body: 'Sách likenew mà như mới 99%, đóng gói cực kỳ chắc chắn, giao hoả tốc đúng 90 phút đã nhận được.',
        verifiedPurchase: 1,
        createdAt: '2026-10-25T14:00:00.000Z',
      },
      {
        bookId: 'tu-duy-nhanh-va-cham',
        name: 'Hoàng Minh Quân',
        email: 'quan.hm@gmail.com',
        rating: 5,
        body: 'Một cuốn sách tuyệt vời về nhận thức con người. Bản dịch dễ hiểu, chất lượng giấy in tốt.',
        verifiedPurchase: 1,
        createdAt: '2026-10-22T08:30:00.000Z',
      },
      {
        bookId: 'cha-giau-cha-ngheo',
        name: 'Phạm Hồng Ánh',
        email: 'anh.ph@gmail.com',
        rating: 4,
        body: 'Nội dung cốt lõi rất hay về tài sản và tiêu sản. Giao hàng nhanh, shipper thân thiện.',
        verifiedPurchase: 1,
        createdAt: '2026-10-23T11:20:00.000Z',
      },
    ]

    for (const r of sampleReviews) {
      run(
        `INSERT INTO book_reviews (book_id, name, email, rating, body, verified_purchase, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.bookId, r.name, r.email, r.rating, r.body, r.verifiedPurchase, r.createdAt]
      )
    }

    // 12. Nạp Yêu cầu thu mua sách cũ (Buyback Requests & History)
    const sampleBuybacks = [
      {
        code: 'BB-9001',
        bookId: 'khoi-nghiep-tinh-gon',
        bookTitle: 'Khởi nghiệp tinh gọn',
        author: 'Eric Ries',
        condition: 'likenew',
        estimatedPrice: 58000,
        finalPrice: 58000,
        customerName: 'Nguyễn Văn An',
        phone: '0903123456',
        email: 'nguyenvanan@gmail.com',
        address: '12 Lê Lợi, Quận 1, TP.HCM',
        bankName: 'Techcombank',
        bankAccount: '19034567890',
        accountHolder: 'NGUYEN VAN AN',
        note: 'Sách đọc xong một lần giữ rất cẩn thận, không quăn mép',
        status: 'paid',
        createdAt: '2026-10-23T10:00:00.000Z',
        updatedAt: '2026-10-24T15:00:00.000Z',
        history: [
          { status: 'pending', note: 'Khách gửi yêu cầu thu mua trực tuyến', at: '2026-10-23T10:00:00.000Z' },
          { status: 'collecting', note: 'Shipper đã đến lấy sách tại nhà', at: '2026-10-23T15:00:00.000Z' },
          { status: 'inspecting', note: 'Chuyên viên kiểm định sách đạt chuẩn Likenew 98%', at: '2026-10-24T09:30:00.000Z' },
          { status: 'paid', note: 'Đã giải ngân 58.000đ vào tài khoản Techcombank của khách', at: '2026-10-24T15:00:00.000Z' },
        ],
      },
      {
        code: 'BB-9002',
        bookId: 'tu-duy-nhanh-va-cham',
        bookTitle: 'Tư duy nhanh và chậm',
        author: 'Daniel Kahneman',
        condition: 'used',
        estimatedPrice: 47700,
        finalPrice: null,
        customerName: 'Trần Văn Cường',
        phone: '0934567890',
        email: 'cuongtv@gmail.com',
        address: '320 Trường Chinh, Đống Đa, Hà Nội',
        bankName: 'MB Bank',
        bankAccount: '0345678901',
        accountHolder: 'TRAN VAN CUONG',
        note: 'Sách có đánh dấu bút dạ quang ở một số trang chương 1-3',
        status: 'inspecting',
        createdAt: '2026-10-25T14:00:00.000Z',
        updatedAt: '2026-10-26T10:00:00.000Z',
        history: [
          { status: 'pending', note: 'Khách gửi yêu cầu thu mua', at: '2026-10-25T14:00:00.000Z' },
          { status: 'collecting', note: 'Bưu tá đã gom sách chuyển về kho Hà Nội', at: '2026-10-25T17:00:00.000Z' },
          { status: 'inspecting', note: 'Đang thẩm định số trang highlight để chốt giá thu mua', at: '2026-10-26T10:00:00.000Z' },
        ],
      },
      {
        code: 'BB-9003',
        bookId: 'dac-nhan-tam',
        bookTitle: 'Đắc nhân tâm',
        author: 'Dale Carnegie',
        condition: 'likenew',
        estimatedPrice: 38000,
        finalPrice: null,
        customerName: 'Lê Minh Tuấn',
        phone: '0912113355',
        email: 'tuanlm@gmail.com',
        address: '55 Hai Bà Trưng, Quận 3, TP.HCM',
        bankName: 'Vietcombank',
        bankAccount: '0071000123456',
        accountHolder: 'LE MINH TUAN',
        note: 'Muốn bán để mua cuốn khác trên shop',
        status: 'pending',
        createdAt: '2026-10-26T15:20:00.000Z',
        updatedAt: '2026-10-26T15:20:00.000Z',
        history: [
          { status: 'pending', note: 'Đăng ký bán lại thành công, chờ xếp lịch hẹn lấy sách', at: '2026-10-26T15:20:00.000Z' },
        ],
      },
    ]

    for (const bb of sampleBuybacks) {
      run(
        `INSERT INTO buyback_requests (
          code, book_id, book_title, author, condition, estimated_price, final_price,
          customer_name, phone, email, address, bank_name, bank_account, account_holder,
          note, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bb.code, bb.bookId, bb.bookTitle, bb.author, bb.condition, bb.estimatedPrice, bb.finalPrice,
          bb.customerName, bb.phone, bb.email, bb.address, bb.bankName, bb.bankAccount, bb.accountHolder,
          bb.note, bb.status, bb.createdAt, bb.updatedAt
        ]
      )

      for (const h of bb.history) {
        run(
          `INSERT INTO buyback_history (buyback_code, status, note, created_at)
           VALUES (?, ?, ?, ?)`,
          [bb.code, h.status, h.note, h.at]
        )
      }
    }
  })

  seedMarketplace()

  // 13. Xuất file JSON database mẫu ra `backend/data/sample_database.json`
  if (exportJson) exportSampleJson()

  console.log('✅ Đã nạp thành công bộ Database mẫu cho BookWise:')
  console.log('  - 5 Tài khoản người dùng (1 Admin + 3 Khách hàng + 1 Người bán sinh viên)')
  console.log('  - 4 Danh mục sách & 49 Đầu sách, tin đăng của kho BookWise và người bán')
  console.log('  - 3 Mã giảm giá (BOOKWISE50K, GIAM10, FREESHIP15K)')
  console.log('  - 5 Đơn hàng mẫu ở các trạng thái (Delivered, Shipping, Confirmed, Pending, Cancelled)')
  console.log('  - Vận đơn giao hàng chi tiết kèm trạm kiểm soát (AhaMove, GHN, Viettel Post)')
  console.log('  - 3 Phiếu hỗ trợ CSKH (Mở & Đã xử lý) + FAQs + Đánh giá sách')
  console.log('  - 3 Yêu cầu thu mua sách cũ (Buyback flow)')
  console.log('  - File backup JSON: backend/data/sample_database.json')
}

const DEMO_LISTINGS = [
  ['tam-ly-hoc-ve-tien', 'likenew', 99000, 2, 'Mua học kỳ trước, đọc một lần, còn bookmark tặng kèm'],
  ['cha-giau-cha-ngheo', 'used', 39000, 1, 'Gáy hơi cong, vài trang gạch chân bút chì'],
  ['nha-dau-tu-thong-minh', 'likenew', 139000, 1, 'Sách môn Tài chính doanh nghiệp, giữ rất kỹ'],
  ['su-that-ve-the-gioi', 'used', 59000, 1, 'Bìa sờn góc, ruột sạch'],
  ['nguon-goc-cac-loai', 'used', 79000, 1, 'Có ghi chú bên lề chương 4–6'],
]

/**
 * Nạp sàn người bán: tách tồn kho mỗi đầu sách thành tin của kho BookWise (40% như mới, còn lại đã dùng),
 * thêm một người bán sinh viên đã được duyệt cùng vài tin đăng. Server gọi hàm này khi bảng listings còn trống.
 */
export function seedMarketplace() {
  transaction(() => {
    const at = '2026-10-01T08:00:00.000Z'
    const books = db.prepare('SELECT id, list_price, stock FROM books').all()
    const insert = db.prepare(
      `INSERT OR IGNORE INTO listings (id, book_id, seller_id, seller_name, condition, price, qty, sold, note, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', ?, ?)`
    )
    for (const b of books) {
      const likenew = Math.round(b.stock * 0.4)
      for (const [condition, qty] of [['likenew', likenew], ['used', b.stock - likenew]]) {
        if (qty > 0) {
          insert.run(storeListingId(b.id, condition), b.id, BOOKWISE_SELLER, 'BookWise', condition, storePrice(b, condition), qty, 'Đã qua kiểm định 7 bước của BookWise', at, at)
        }
      }
    }

    run(
      `INSERT OR IGNORE INTO seller_applications (email, full_name, phone, id_number, school, pickup_address, bank_name, bank_account, account_holder, has_student_card, status, submitted_at, reviewed_at)
       VALUES (?, ?, ?, '079204001234', ?, 'KTX 135B Trần Hưng Đạo, Quận 1, TP. Hồ Chí Minh', 'MB Bank', '0912345678', 'TRAN THU HA', 1, 'approved', '2026-09-20T09:00:00.000Z', '2026-09-21T10:00:00.000Z')`,
      [DEMO_SELLER.email, DEMO_SELLER.name, DEMO_SELLER.phone, DEMO_SELLER.school]
    )
    if (!db.prepare('SELECT 1 FROM seller_history WHERE seller_email = ?').all(DEMO_SELLER.email).length) {
      run(`INSERT INTO seller_history (seller_email, status, note, created_at) VALUES (?, 'pending', 'Gửi hồ sơ đăng ký bán sách', '2026-09-20T09:00:00.000Z')`, [DEMO_SELLER.email])
      run(`INSERT INTO seller_history (seller_email, status, note, created_at) VALUES (?, 'approved', 'CCCD và thẻ sinh viên hợp lệ', '2026-09-21T10:00:00.000Z')`, [DEMO_SELLER.email])
    }
    for (const [bookId, condition, price, qty, note] of DEMO_LISTINGS) {
      insert.run(`sv-${bookId}`, bookId, DEMO_SELLER.email, DEMO_SELLER.name, condition, price, qty, note, at, at)
    }

    for (const b of books) refreshBook(b.id)
  })
}

// Bản xuất để tham khảo cấu trúc dữ liệu: không kèm API key và mật khẩu đã băm
function exportSampleJson() {
  const tables = [
    'users',
    'categories',
    'books',
    'coupons',
    'shipping_methods',
    'orders',
    'order_items',
    'order_history',
    'delivery_shipments',
    'delivery_checkpoints',
    'support_tickets',
    'support_faqs',
    'book_reviews',
    'buyback_requests',
    'buyback_history',
    'seller_applications',
    'seller_history',
    'listings',
  ]

  const dump = {}
  for (const table of tables) {
    dump[table] = db.prepare(`SELECT * FROM ${table}`).all()
  }
  dump.users = dump.users.map(({ password_hash: _hash, ...u }) => u)
  dump.seller_applications = dump.seller_applications.map((a) => ({ ...a, id_number: `${a.id_number.slice(0, 4)}••••${a.id_number.slice(-4)}` }))

  const exportPath = path.resolve(__dirname, '../data/sample_database.json')
  fs.writeFileSync(exportPath, JSON.stringify(dump, null, 2), 'utf-8')
}

// Chỉ tự chạy khi gọi trực tiếp `node src/seed.js`; server import file này để nạp dữ liệu lần đầu
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  seed()
}
