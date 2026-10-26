// Logic thuần cho chợ sách cũ: tin đăng, giá trần, thống kê người bán.

import { COMMISSION_RATE, CONDITIONS, MIN_LISTING_PRICE } from '../data/catalog'
import { formatMoney } from './format'
import { priceCap, storePrice } from './pricing'
import { BOOKWISE_SELLER, type Book, type ConditionId, type Listing, type Order } from './types'

export const isBuyable = (l: Listing) => l.status === 'active' && l.qty > 0

/** Các tin còn hàng của một đầu sách, rẻ nhất trước; cùng giá thì ưu tiên kho BookWise */
export const offersFor = (listings: Listing[], bookId: string) =>
  listings
    .filter((l) => l.bookId === bookId && isBuyable(l))
    .sort((a, b) => a.price - b.price || Number(b.sellerId === BOOKWISE_SELLER) - Number(a.sellerId === BOOKWISE_SELLER))

/**
 * Gắn giá thấp nhất và tổng số cuốn còn bán vào từng đầu sách.
 * Sách chưa có ai bán vẫn hiện, giá tham khảo là giá BookWise bán bản đã dùng.
 */
export function withOffers(books: Book[], listings: Listing[]): Book[] {
  const stats = new Map<string, { price: number; stock: number; offers: number }>()
  for (const l of listings) {
    if (!isBuyable(l)) continue
    const s = stats.get(l.bookId) ?? { price: Infinity, stock: 0, offers: 0 }
    stats.set(l.bookId, { price: Math.min(s.price, l.price), stock: s.stock + l.qty, offers: s.offers + 1 })
  }
  return books.map((b) => {
    const s = stats.get(b.id)
    return s ? { ...b, ...s } : { ...b, price: storePrice(b, 'used'), stock: 0, offers: 0 }
  })
}

/** Tin đăng kho BookWise tạo từ số tồn của dữ liệu mẫu: khoảng 40% như mới, còn lại đã dùng */
export function seedStoreListings(books: Book[], at: string): Listing[] {
  return books.flatMap((b) => {
    const likenew = Math.round(b.stock * 0.4)
    const split: [ConditionId, number][] = [
      ['likenew', likenew],
      ['used', b.stock - likenew],
    ]
    return split
      .filter(([, qty]) => qty > 0)
      .map(([condition, qty]) => ({
        id: `bw-${b.id}-${condition}`,
        bookId: b.id,
        sellerId: BOOKWISE_SELLER,
        sellerName: 'BookWise',
        condition,
        price: storePrice(b, condition),
        qty,
        sold: 0,
        note: 'Đã qua kiểm định 7 bước của BookWise',
        status: 'active' as const,
        createdAt: at,
        updatedAt: at,
      }))
  })
}

export interface ListingInput {
  bookId: string
  condition: ConditionId
  price: number
  qty: number
  note: string
}

export function validateListing(input: ListingInput, book: Book | undefined): string | null {
  if (!book) return 'Chọn đầu sách muốn bán'
  const condition = CONDITIONS[input.condition]
  if (!condition) return 'Chọn tình trạng sách'
  if (!Number.isInteger(input.price) || input.price < MIN_LISTING_PRICE) return `Giá tối thiểu ${formatMoney(MIN_LISTING_PRICE)}`
  const cap = priceCap(book, input.condition)
  if (input.price > cap) {
    return `Sách ${condition.label.toLowerCase()} chỉ được bán tối đa ${formatMoney(cap)} (${Math.round(condition.cap * 100)}% giá bìa)`
  }
  if (!Number.isInteger(input.qty) || input.qty < 1 || input.qty > 20) return 'Số lượng từ 1 đến 20 cuốn'
  if (input.note.trim().length > 300) return 'Mô tả tối đa 300 ký tự'
  return null
}

/** Tiền người bán nhận cho một cuốn sau khi trừ phí dịch vụ */
export const payoutOf = (price: number) => price - Math.round(price * COMMISSION_RATE)

export interface SellerSale {
  orderCode: string
  at: string
  title: string
  condition: ConditionId
  qty: number
  unitPrice: number
  payout: number
  /** paid: đơn đã giao, tiền được đối soát; holding: đơn đang xử lý; cancelled: đơn huỷ */
  state: 'holding' | 'paid' | 'cancelled'
}

export function sellerSales(orders: Order[], sellerId: string): SellerSale[] {
  return orders.flatMap((o) =>
    o.items
      .filter((i) => i.sellerId === sellerId)
      .map((i) => ({
        orderCode: o.code,
        at: o.createdAt,
        title: i.title,
        condition: i.condition,
        qty: i.qty,
        unitPrice: i.unitPrice,
        payout: payoutOf(i.unitPrice) * i.qty,
        state: o.status === 'delivered' ? ('paid' as const) : o.status === 'cancelled' ? ('cancelled' as const) : ('holding' as const),
      })),
  )
}

export function sellerSummary(sales: SellerSale[]) {
  const sum = (state: SellerSale['state']) => sales.filter((s) => s.state === state).reduce((t, s) => t + s.payout, 0)
  return {
    soldCount: sales.filter((s) => s.state !== 'cancelled').reduce((t, s) => t + s.qty, 0),
    paid: sum('paid'),
    holding: sum('holding'),
  }
}
