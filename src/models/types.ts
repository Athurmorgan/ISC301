// Kiểu dữ liệu miền (domain) của BookWise. Không phụ thuộc React hay localStorage.

export type CategoryId = 'kinh-te' | 'ky-nang' | 'van-hoc' | 'khoa-hoc'

export interface Category {
  id: CategoryId
  name: string
  blurb: string
}

export type ConditionId = 'likenew' | 'used'

export interface Condition {
  id: ConditionId
  label: string
  note: string
  /** Giá BookWise tự bán = giá bìa × hệ số */
  factor: number
  /** Người bán không được đăng giá cao hơn giá bìa × mức trần này */
  cap: number
}

export interface Book {
  id: string
  title: string
  originalTitle: string
  originalLanguage: string
  author: string
  publisher?: string
  category: CategoryId
  cover: string
  /** Giá thấp nhất đang được rao bán (tính lại từ các tin đăng) */
  price: number
  /** Giá in trên bìa */
  listPrice: number
  /** Tổng số cuốn còn bán của mọi người bán (tính lại từ các tin đăng) */
  stock: number
  /** Số tin đăng còn hàng */
  offers?: number
  sold: number
  rating: number
  ratingCount: number
  pages: number
  firstPublished: number
  description: string
  staffPick?: string
}

/** Người bán: 'bookwise' là kho của cửa hàng, còn lại là email người dùng đã được duyệt */
export const BOOKWISE_SELLER = 'bookwise'

export type ListingStatus = 'active' | 'paused' | 'suspended' | 'removed'

/** Một tin đăng bán: một (hoặc vài) cuốn cụ thể của một người bán, cùng tình trạng và giá */
export interface Listing {
  id: string
  bookId: string
  sellerId: string
  sellerName: string
  condition: ConditionId
  price: number
  /** Số cuốn còn lại */
  qty: number
  sold: number
  note: string
  photo?: string
  status: ListingStatus
  /** Lý do khi quản trị gỡ tin */
  reason?: string
  createdAt: string
  updatedAt: string
}

export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface SellerEvent {
  status: SellerStatus
  at: string
  note: string
}

/** Hồ sơ đăng ký bán sách: phải được quản trị duyệt mới được đăng tin */
export interface SellerApplication {
  email: string
  fullName: string
  phone: string
  /** Số CCCD 12 chữ số */
  idNumber: string
  /** Ảnh mặt trước CCCD */
  idPhoto: string
  /** Ảnh thẻ sinh viên (không bắt buộc, có thì được gắn nhãn Sinh viên) */
  studentCardPhoto?: string
  school: string
  pickupAddress: string
  bankName: string
  bankAccount: string
  accountHolder: string
  status: SellerStatus
  reason?: string
  submittedAt: string
  reviewedAt?: string
  history: SellerEvent[]
}

export interface CartItem {
  listingId: string
  bookId: string
  condition: ConditionId
  qty: number
}

export interface CartLine extends CartItem {
  book: Book
  listing: Listing
  unitPrice: number
  lineTotal: number
}

export type CouponKind = 'fixed' | 'percent' | 'shipping'

export interface Coupon {
  code: string
  kind: CouponKind
  value: number
  /** Mức giảm tối đa cho mã phần trăm */
  cap?: number
  minSubtotal: number
  description: string
}

export type ShippingId = 'standard' | 'express'

export interface ShippingMethod {
  id: ShippingId
  name: string
  fee: number
  eta: string
  carrier: string
  /** Chỉ phục vụ các tỉnh/thành này; bỏ trống = toàn quốc */
  provinces?: string[]
}

export type PaymentId = 'vietqr' | 'ewallet' | 'card' | 'cod'

export interface PaymentMethod {
  id: PaymentId
  name: string
  detail: string
}

export interface Totals {
  lines: CartLine[]
  itemCount: number
  subtotal: number
  listTotal: number
  discount: number
  shippingFee: number
  shippingDiscount: number
  total: number
  appliedCoupons: Coupon[]
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled'

export interface Address {
  name: string
  phone: string
  email: string
  province: string
  district: string
  street: string
}

export interface OrderItem {
  bookId: string
  title: string
  author: string
  cover: string
  category: CategoryId
  condition: ConditionId
  unitPrice: number
  qty: number
  /** Đơn tạo trước khi có chợ người bán không có các trường này */
  listingId?: string
  sellerId?: string
  sellerName?: string
}

export interface OrderEvent {
  status: OrderStatus
  at: string
  note: string
}

export interface Order {
  code: string
  createdAt: string
  userEmail: string | null
  customer: Address
  note: string
  items: OrderItem[]
  shipping: { id: ShippingId; name: string; fee: number }
  payment: { id: PaymentId; name: string; paid: boolean }
  coupons: string[]
  subtotal: number
  discount: number
  shippingDiscount: number
  total: number
  status: OrderStatus
  history: OrderEvent[]
}

export type Role = 'customer' | 'admin'

export interface User {
  email: string
  name: string
  phone: string
  passwordHash: string
  role: Role
  address: Partial<Address>
  createdAt: string
}

export interface Review {
  id?: string
  bookId: string
  name: string
  email?: string
  rating: number
  body: string
  at: string
  verifiedPurchase?: boolean
}

export type BuybackStatus = 'pending' | 'collecting' | 'inspecting' | 'paid' | 'rejected'

export interface BuybackEvent {
  status: BuybackStatus
  at: string
  note: string
}

export interface BuybackRequest {
  code: string
  createdAt: string
  bookId?: string
  bookTitle: string
  author: string
  condition: ConditionId
  estimatedPrice: number
  customerName: string
  phone: string
  email?: string
  address: string
  bankName: string
  bankAccount: string
  accountHolder: string
  note?: string
  photo?: string
  status: BuybackStatus
  history: BuybackEvent[]
}

export type TicketTopic = 'order' | 'quality' | 'payment' | 'buyback' | 'other'

export interface Ticket {
  code: string
  topic: TicketTopic
  name: string
  email: string
  phone: string
  orderCode: string
  message: string
  attachment?: string
  status: 'open' | 'resolved'
  at: string
}

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string }
