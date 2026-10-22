import { BUYBACK_RATE, CONDITIONS } from '../data/catalog'
import type { Book, ConditionId } from './types'

const roundThousand = (n: number) => Math.round(n / 1000) * 1000

/** Giá một cuốn theo tình trạng. Giá ưu đãi trong ngày chỉ áp cho bản mới. */
export function unitPrice(book: Book, condition: ConditionId = 'seal'): number {
  if (condition === 'seal') return book.dealPrice ?? book.price
  return roundThousand(book.price * CONDITIONS[condition].factor)
}

/** Giá thấp nhất có thể mua — dùng cho thẻ sách "từ ...đ" */
export function lowestPrice(book: Book): number {
  return Math.min(unitPrice(book, 'seal'), unitPrice(book, 'used'))
}

export function buybackQuote(book: Book, condition: Exclude<ConditionId, 'seal'>): number {
  return roundThousand(book.price * BUYBACK_RATE[condition])
}

export const isOnDeal = (book: Book) => book.dealPrice !== undefined && book.dealPrice < book.price
