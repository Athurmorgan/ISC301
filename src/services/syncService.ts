// Đồng bộ dữ liệu giữa máy chủ và kho localStorage.
// Máy chủ là nguồn đúng cho giá và tồn kho; localStorage giữ bản sao để web vẫn chạy khi mất mạng.

import type { Book, CategoryId, ConditionId, Order, OrderStatus, PaymentId, ShippingId } from '../models/types'
import { API_ENABLED, api, isNetworkError, type BookRow, type HistoryRow, type OrderItemRow, type OrderRow } from './apiClient'
import { booksStore } from './bookRepository'
import { memoryStore } from './store'

export type ServerState = 'off' | 'checking' | 'online' | 'offline'

export const serverStatus = memoryStore<{ state: ServerState; syncedAt: string | null }>({
  state: API_ENABLED ? 'checking' : 'off',
  syncedAt: null,
})

export const markOffline = () => serverStatus.set((s) => ({ ...s, state: 'offline' }))

export function toBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title ?? row.title,
    originalLanguage: row.original_language ?? 'tiếng Việt',
    author: row.author,
    publisher: row.publisher ?? undefined,
    category: row.category as CategoryId,
    cover: row.cover,
    price: row.price,
    listPrice: row.list_price,
    dealPrice: row.deal_price ?? undefined,
    stock: row.stock,
    sold: row.sold,
    rating: row.rating,
    ratingCount: row.rating_count,
    pages: row.pages,
    firstPublished: row.first_published,
    description: row.description,
    staffPick: row.staff_pick ?? undefined,
  }
}

export function toOrder(row: OrderRow, items: OrderItemRow[], timeline: HistoryRow[]): Order {
  return {
    code: row.code,
    createdAt: row.created_at,
    userEmail: row.user_email,
    customer: {
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email ?? '',
      province: row.customer_province,
      district: row.customer_district,
      street: row.customer_street,
    },
    note: row.note ?? '',
    items: items.map((i) => ({
      bookId: i.book_id,
      title: i.title,
      author: i.author,
      cover: i.cover,
      category: i.category as CategoryId,
      condition: i.condition as ConditionId,
      unitPrice: i.unit_price,
      qty: i.qty,
    })),
    shipping: { id: row.shipping_id as ShippingId, name: row.shipping_name, fee: row.shipping_fee },
    payment: { id: row.payment_id as PaymentId, name: row.payment_name, paid: !!row.is_paid },
    coupons: [],
    subtotal: row.subtotal,
    discount: row.discount,
    shippingDiscount: row.shipping_discount,
    total: row.total,
    status: row.status as OrderStatus,
    history: timeline.map((h) => ({ status: h.status as OrderStatus, at: h.created_at, note: h.note })),
  }
}

/**
 * Lấy danh mục sách từ máy chủ và gộp vào kho cục bộ.
 * Sách chỉ có ở máy (do quản trị thêm offline) vẫn được giữ lại.
 */
export async function syncBooks(): Promise<boolean> {
  if (!API_ENABLED) return false
  try {
    const rows = await api.books.list(100)
    const remote = new Map(rows.map((r) => [r.id, toBook(r)]))
    booksStore.set((local) => {
      const merged = local.map((b) => {
        const r = remote.get(b.id)
        // Giữ ảnh bìa cục bộ nếu quản trị đã đổi; giá và tồn kho lấy theo máy chủ
        return r ? { ...b, ...r, cover: b.cover || r.cover } : b
      })
      const known = new Set(local.map((b) => b.id))
      return [...merged, ...[...remote.values()].filter((b) => !known.has(b.id))]
    })
    serverStatus.set({ state: 'online', syncedAt: new Date().toISOString() })
    return true
  } catch {
    markOffline()
    return false
  }
}

/**
 * Gửi bản ghi lên máy chủ mà không chặn giao diện (phiếu hỗ trợ, yêu cầu thu mua...).
 * Dữ liệu đã nằm trong localStorage nên lỗi ở đây chỉ ghi ra console.
 */
export function pushInBackground(label: string, task: () => Promise<unknown>) {
  if (!API_ENABLED) return
  task().catch((e) => {
    if (isNetworkError(e)) markOffline()
    console.warn(`[BookWise] Không gửi được ${label} lên máy chủ:`, e)
  })
}
