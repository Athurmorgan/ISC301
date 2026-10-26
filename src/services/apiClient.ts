// Gọi backend REST của BookWise. Chỉ bật khi có VITE_API_BASE_URL trong .env;
// nếu không, toàn bộ web vẫn chạy bằng localStorage như trước.
// Xác thực bằng JWT lấy từ /api/auth/login, không nhúng API key vào mã phía trình duyệt.

import { persistentStore } from './store'

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export const API_ENABLED = BASE.length > 0

/** JWT của phiên đăng nhập trên máy chủ */
export const tokenStore = persistentStore<string | null>('api-token', () => null)

/** Lỗi do máy chủ trả về (4xx/5xx), phân biệt với lỗi mạng */
export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface Envelope<T> {
  ok: boolean
  data?: T
  error?: string
  message?: string
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!API_ENABLED) throw new Error('Chưa cấu hình VITE_API_BASE_URL')
  const headers: Record<string, string> = {}
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(BASE + path, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const json = (await res.json().catch(() => ({}))) as Envelope<T>
  if (res.status === 401 && token) tokenStore.set(null)
  if (!res.ok || json.ok === false) throw new ApiError(json.error ?? `Máy chủ lỗi (${res.status})`, res.status)
  return (json.data ?? json) as T
}

/** Lỗi mạng (máy chủ tắt, CORS...) thì nên chuyển sang chế độ offline */
export const isNetworkError = (e: unknown) => !(e instanceof ApiError)

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Không kết nối được máy chủ')

// ---- Kiểu dữ liệu thô từ máy chủ (snake_case như trong SQLite) ----

export interface BookRow {
  id: string
  title: string
  original_title: string | null
  original_language: string | null
  author: string
  publisher: string | null
  category: string
  cover: string
  price: number
  list_price: number
  deal_price: number | null
  stock: number
  sold: number
  rating: number
  rating_count: number
  pages: number
  first_published: number
  description: string
  staff_pick: string | null
}

export interface ApiUser {
  id: number
  email: string
  name: string
  phone: string
  role: 'customer' | 'admin' | 'partner'
  address: { province?: string; district?: string; street?: string }
  createdAt: string
}

export interface CheckoutResult {
  orderCode: string
  subtotal: number
  discount: number
  shippingFee: number
  shippingDiscount: number
  total: number
  appliedCoupons: string[]
  createdAt: string
}

export interface OrderRow {
  code: string
  user_email: string | null
  customer_name: string
  customer_phone: string
  customer_email: string
  customer_province: string
  customer_district: string
  customer_street: string
  note: string
  shipping_id: string
  shipping_name: string
  shipping_fee: number
  payment_id: string
  payment_name: string
  is_paid: number
  subtotal: number
  discount: number
  shipping_discount: number
  total: number
  status: string
  created_at: string
  masked?: boolean
}

export interface OrderItemRow {
  book_id: string
  title: string
  author: string
  cover: string
  category: string
  condition: string
  unit_price: number
  qty: number
}

export interface HistoryRow {
  status: string
  note: string
  created_at: string
}

const json = (body: unknown) => ({ body })

export const api = {
  health: () => request<{ status: string }>('/health'),

  auth: {
    login: (email: string, password: string) => request<{ token: string; user: ApiUser }>('/api/auth/login', json({ email, password })),
    register: (input: { name: string; email: string; phone: string; password: string }) =>
      request<{ token: string; user: ApiUser }>('/api/auth/register', json(input)),
  },

  books: {
    list: (limit = 100) => request<BookRow[]>(`/api/books?limit=${limit}`),
  },

  orders: {
    checkout: (payload: {
      customer: { name: string; phone: string; email: string; province: string; district: string; street: string }
      items: { listingId: string; bookId: string; condition: string; qty: number }[]
      shippingId: string
      paymentId: string
      couponCodes: string[]
      note: string
    }) => request<CheckoutResult>('/api/orders/checkout', json(payload)),
    pay: (orderCode: string, extra: { otp?: string; confirm?: boolean } = {}) =>
      request<{ isPaid?: boolean }>('/api/orders/process-payment', json({ orderCode, ...extra })),
    track: (code: string, phone?: string) =>
      request<{ order: OrderRow; items: OrderItemRow[]; timeline: HistoryRow[] }>(
        `/api/orders/track/${encodeURIComponent(code)}${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`,
      ),
    cancel: (code: string, reason: string, phone?: string) =>
      request<unknown>(`/api/orders/${encodeURIComponent(code)}/cancel`, json({ reason, phone })),
    setStatus: (code: string, status: string, note?: string) =>
      request<unknown>(`/api/orders/${encodeURIComponent(code)}/status`, { method: 'PATCH', body: { status, note } }),
  },

  support: {
    createTicket: (payload: { topic: string; name: string; email: string; phone?: string; orderCode?: string; message: string }) =>
      request<{ code: string }>('/api/support/tickets', json(payload)),
  },

  buybacks: {
    create: (payload: Record<string, unknown>) => request<{ code: string }>('/api/buybacks', json(payload)),
  },

  sellers: {
    apply: (payload: Record<string, unknown>) => request<unknown>('/api/sellers/apply', json(payload)),
    review: (email: string, status: string, note: string) =>
      request<unknown>(`/api/sellers/${encodeURIComponent(email)}/status`, { method: 'PATCH', body: { status, note } }),
  },

  listings: {
    save: <T extends { id: string }>(listing: T) =>
      request<unknown>(`/api/listings/${encodeURIComponent(listing.id)}`, { method: 'PUT', body: listing }),
    remove: (id: string) => request<unknown>(`/api/listings/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    moderate: (id: string, status: string, reason: string) =>
      request<unknown>(`/api/listings/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status, reason } }),
  },
}
