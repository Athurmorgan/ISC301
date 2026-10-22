import { CATEGORIES, CONDITIONS, PAYMENTS } from '../data/catalog'
import { unitPrice } from './pricing'
import type { Book, CategoryId, ConditionId, Order, PaymentId } from './types'

export type ReportRange = 7 | 30 | 0

export interface SalesReport {
  source: 'orders' | 'sample'
  orderCount: number
  revenue: number
  averageOrder: number
  booksSold: number
  byCategory: { id: CategoryId; name: string; revenue: number }[]
  topBooks: { id: string; title: string; author: string; cover: string; qty: number; revenue: number }[]
  byPayment: { id: PaymentId; name: string; count: number }[]
  byCondition: { id: ConditionId; label: string; qty: number }[]
  express: number
}

const DAY = 86_400_000

/** Số liệu từ các đơn chưa huỷ trong khoảng thời gian (0 = tất cả). */
export function salesFromOrders(orders: Order[], range: ReportRange, now = Date.now()): SalesReport | null {
  const list = orders.filter((o) => o.status !== 'cancelled' && (range === 0 || now - Date.parse(o.createdAt) <= range * DAY))
  if (!list.length) return null

  const cat = new Map<CategoryId, number>()
  const books = new Map<string, SalesReport['topBooks'][number]>()
  const pay = new Map<PaymentId, number>()
  const cond = new Map<ConditionId, number>()
  let booksSold = 0

  for (const o of list) {
    pay.set(o.payment.id, (pay.get(o.payment.id) ?? 0) + 1)
    for (const i of o.items) {
      const line = i.unitPrice * i.qty
      booksSold += i.qty
      cat.set(i.category, (cat.get(i.category) ?? 0) + line)
      cond.set(i.condition, (cond.get(i.condition) ?? 0) + i.qty)
      const b = books.get(i.bookId) ?? { id: i.bookId, title: i.title, author: i.author, cover: i.cover, qty: 0, revenue: 0 }
      b.qty += i.qty
      b.revenue += line
      books.set(i.bookId, b)
    }
  }
  const revenue = list.reduce((s, o) => s + o.total, 0)
  return {
    source: 'orders',
    orderCount: list.length,
    revenue,
    averageOrder: Math.round(revenue / list.length),
    booksSold,
    byCategory: CATEGORIES.map((c) => ({ id: c.id, name: c.name, revenue: cat.get(c.id) ?? 0 })),
    topBooks: [...books.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
    byPayment: PAYMENTS.map((p) => ({ id: p.id, name: p.name, count: pay.get(p.id) ?? 0 })),
    byCondition: (Object.keys(CONDITIONS) as ConditionId[]).map((id) => ({ id, label: CONDITIONS[id].label, qty: cond.get(id) ?? 0 })),
    express: list.filter((o) => o.shipping.id === 'express').length,
  }
}

/** Khi chưa có đơn: ước tính từ số lượng đã bán trong danh mục (ghi rõ là số liệu mẫu). */
export function sampleSales(books: Book[]): SalesReport {
  const byCategory = CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    revenue: books.filter((b) => b.category === c.id).reduce((s, b) => s + b.sold * unitPrice(b), 0),
  }))
  const revenue = byCategory.reduce((s, c) => s + c.revenue, 0)
  const booksSold = books.reduce((s, b) => s + b.sold, 0)
  const orderCount = Math.round(booksSold / 1.7)
  const share: Record<PaymentId, number> = { vietqr: 0.48, ewallet: 0.26, cod: 0.19, card: 0.07 }
  return {
    source: 'sample',
    orderCount,
    revenue,
    averageOrder: Math.round(revenue / orderCount),
    booksSold,
    byCategory,
    topBooks: [...books]
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5)
      .map((b) => ({ id: b.id, title: b.title, author: b.author, cover: b.cover, qty: b.sold, revenue: b.sold * unitPrice(b) })),
    byPayment: PAYMENTS.map((p) => ({ id: p.id, name: p.name, count: Math.round(orderCount * share[p.id]) })),
    byCondition: [
      { id: 'seal', label: CONDITIONS.seal.label, qty: Math.round(booksSold * 0.58) },
      { id: 'likenew', label: CONDITIONS.likenew.label, qty: Math.round(booksSold * 0.29) },
      { id: 'used', label: CONDITIONS.used.label, qty: Math.round(booksSold * 0.13) },
    ],
    express: Math.round(orderCount * 0.34),
  }
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

export function ordersToCsv(orders: Order[]): string {
  const header = ['Mã đơn', 'Ngày đặt', 'Khách hàng', 'SĐT', 'Tỉnh/thành', 'Số cuốn', 'Tạm tính', 'Giảm giá', 'Phí ship', 'Tổng tiền', 'Thanh toán', 'Trạng thái']
  const rows = orders.map((o) => [
    o.code,
    o.createdAt,
    o.customer.name,
    o.customer.phone,
    o.customer.province,
    o.items.reduce((s, i) => s + i.qty, 0),
    o.subtotal,
    o.discount + o.shippingDiscount,
    o.shipping.fee,
    o.total,
    o.payment.name,
    o.status,
  ])
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
}

export function booksToCsv(books: Book[]): string {
  const header = ['Mã', 'Tên sách', 'Tác giả', 'Thể loại', 'Giá bán', 'Giá bìa', 'Tồn kho', 'Đã bán']
  const rows = books.map((b) => [b.id, b.title, b.author, b.category, unitPrice(b), b.listPrice, b.stock, b.sold])
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
}
