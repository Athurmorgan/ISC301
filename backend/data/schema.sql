-- ============================================================================
-- BOOKWISE DATABASE SCHEMA (SQLite compatible)
-- Phục vụ 3 luồng nghiệp vụ cốt lõi:
-- 1. Chăm sóc khách hàng kết hợp Dashboard và Giao hàng
-- 2. Mua bán sách, giao dịch
-- 3. Theo dõi đơn hàng
-- ============================================================================

-- Bảng API Keys (Hỗ trợ xác thực không cần frontend)
CREATE TABLE IF NOT EXISTS api_keys (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client', -- 'admin', 'partner', 'client'
  permissions TEXT NOT NULL DEFAULT '*',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- Bảng Người dùng (Khách hàng & Quản trị viên)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer', -- 'customer', 'admin'
  province TEXT,
  district TEXT,
  street TEXT,
  created_at TEXT NOT NULL
);

-- Bảng Danh mục sách
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  blurb TEXT
);

-- Bảng Sách
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  original_title TEXT,
  original_language TEXT,
  author TEXT NOT NULL,
  publisher TEXT,
  category TEXT NOT NULL,
  cover TEXT NOT NULL,
  price INTEGER NOT NULL,
  list_price INTEGER NOT NULL,
  deal_price INTEGER,
  stock INTEGER NOT NULL DEFAULT 0,
  sold INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 5.0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  pages INTEGER NOT NULL DEFAULT 200,
  first_published INTEGER,
  description TEXT,
  staff_pick TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (category) REFERENCES categories(id)
);

-- Bảng Mã giảm giá (Coupons)
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  kind TEXT NOT NULL, -- 'fixed', 'percent', 'shipping'
  value INTEGER NOT NULL,
  cap INTEGER,
  min_subtotal INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

-- Bảng Phương thức giao hàng
CREATE TABLE IF NOT EXISTS shipping_methods (
  id TEXT PRIMARY KEY, -- 'standard', 'express'
  name TEXT NOT NULL,
  fee INTEGER NOT NULL,
  eta TEXT NOT NULL,
  carrier TEXT NOT NULL,
  provinces_json TEXT -- JSON array các tỉnh/thành áp dụng (hoặc null nếu toàn quốc)
);

-- Bảng Đơn hàng (Orders)
CREATE TABLE IF NOT EXISTS orders (
  code TEXT PRIMARY KEY,
  user_email TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_province TEXT NOT NULL,
  customer_district TEXT NOT NULL,
  customer_street TEXT NOT NULL,
  note TEXT,
  shipping_id TEXT NOT NULL,
  shipping_name TEXT NOT NULL,
  shipping_fee INTEGER NOT NULL,
  payment_id TEXT NOT NULL,
  payment_name TEXT NOT NULL,
  is_paid INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  shipping_discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'shipping', 'delivered', 'cancelled'
  tracking_carrier TEXT,
  tracking_code TEXT,
  eta TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Bảng Chi tiết sản phẩm trong đơn hàng
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT NOT NULL,
  book_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  cover TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL, -- 'likenew', 'used' (đơn cũ có thể còn 'seal')
  unit_price INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  listing_id TEXT,
  seller_id TEXT,
  seller_name TEXT,
  FOREIGN KEY (order_code) REFERENCES orders(code) ON DELETE CASCADE
);

-- Bảng Lịch sử trạng thái đơn hàng (Dòng thời gian - Timeline)
CREATE TABLE IF NOT EXISTS order_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_code) REFERENCES orders(code) ON DELETE CASCADE
);

-- Bảng Vận đơn Giao hàng (Logistics / Delivery Shipments)
CREATE TABLE IF NOT EXISTS delivery_shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_code TEXT UNIQUE NOT NULL,
  order_code TEXT NOT NULL,
  carrier_name TEXT NOT NULL, -- 'AhaMove', 'GHN', 'Viettel Post'
  shipper_name TEXT,
  shipper_phone TEXT,
  origin_hub TEXT NOT NULL DEFAULT 'Kho Tổng BookWise - Quận 1, TP.HCM',
  destination TEXT NOT NULL,
  current_status TEXT NOT NULL, -- 'ready_to_ship', 'picked_up', 'in_transit', 'delivering', 'delivered', 'failed'
  eta TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (order_code) REFERENCES orders(code) ON DELETE CASCADE
);

-- Bảng Trạm kiểm soát vận chuyển (Delivery Checkpoints)
CREATE TABLE IF NOT EXISTS delivery_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id INTEGER NOT NULL,
  location TEXT NOT NULL,
  status_text TEXT NOT NULL,
  description TEXT,
  event_time TEXT NOT NULL,
  FOREIGN KEY (shipment_id) REFERENCES delivery_shipments(id) ON DELETE CASCADE
);

-- Bảng Phiếu hỗ trợ khách hàng (CSKH Tickets)
CREATE TABLE IF NOT EXISTS support_tickets (
  code TEXT PRIMARY KEY,
  topic TEXT NOT NULL, -- 'order', 'quality', 'payment', 'buyback', 'other'
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  order_code TEXT,
  message TEXT NOT NULL,
  attachment TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'resolved'
  response TEXT,
  responder_name TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

-- Bảng Câu hỏi thường gặp (FAQ)
CREATE TABLE IF NOT EXISTS support_faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Bảng Đánh giá sách (Reviews & Feedbacks)
CREATE TABLE IF NOT EXISTS book_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT NOT NULL,
  verified_purchase INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Bảng Giao dịch thu mua sách cũ (Buyback Requests)
CREATE TABLE IF NOT EXISTS buyback_requests (
  code TEXT PRIMARY KEY,
  book_id TEXT,
  book_title TEXT NOT NULL,
  author TEXT NOT NULL,
  condition TEXT NOT NULL, -- 'likenew', 'used'
  estimated_price INTEGER NOT NULL,
  final_price INTEGER,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_account TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  note TEXT,
  photo TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'collecting', 'inspecting', 'paid', 'rejected'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Bảng Lịch sử xử lý thu mua sách cũ
CREATE TABLE IF NOT EXISTS buyback_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyback_code TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (buyback_code) REFERENCES buyback_requests(code) ON DELETE CASCADE
);

-- Chỉ mục để tối ưu tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON delivery_shipments(tracking_code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);

-- Hồ sơ đăng ký bán sách: người dùng gửi CCCD + tài khoản ngân hàng, quản trị duyệt mới được đăng tin
-- Ảnh giấy tờ không lưu trên máy chủ trong bản demo, chỉ ghi nhận có thẻ sinh viên hay không
CREATE TABLE IF NOT EXISTS seller_applications (
  email TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_number TEXT NOT NULL,
  school TEXT,
  pickup_address TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_account TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  has_student_card INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
  reason TEXT,
  submitted_at TEXT NOT NULL,
  reviewed_at TEXT
);

CREATE TABLE IF NOT EXISTS seller_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_email TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (seller_email) REFERENCES seller_applications(email) ON DELETE CASCADE
);

-- Tin đăng bán: kho BookWise (seller_id = 'bookwise') và người bán đã được duyệt
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  condition TEXT NOT NULL, -- 'likenew', 'used'
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  sold INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'suspended', 'removed'
  reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listings_book ON listings(book_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
