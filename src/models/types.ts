// Kiểu dữ liệu miền (domain) của BookWise. Không phụ thuộc React hay localStorage.

export type CategoryId = 'kinh-te' | 'ky-nang' | 'van-hoc' | 'khoa-hoc'

export interface Category {
  id: CategoryId
  name: string
  blurb: string
}

export type ConditionId = 'seal' | 'likenew' | 'used'

export interface Condition {
  id: ConditionId
  label: string
  note: string
  /** Giá = giá bản mới × hệ số */
  factor: number
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
  /** Giá bán bản mới nguyên seal */
  price: number
  /** Giá in trên bìa */
  listPrice: number
  /** Giá trong chương trình giá tốt hôm nay (chỉ áp cho bản mới) */
  dealPrice?: number
  stock: number
  sold: number
  rating: number
  ratingCount: number
  pages: number
  firstPublished: number
  description: string
  staffPick?: string
}

export interface CartItem {
  bookId: string
  condition: ConditionId
  qty: number
}

export interface CartLine extends CartItem {
  book: Book
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
  bookId: string
  name: string
  rating: number
  body: string
  at: string
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
