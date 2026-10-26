import { BUYBACK_RATE, CONDITIONS } from '../data/catalog'
import type { Book, ConditionId } from './types'

export const roundThousand = (n: number) => Math.round(n / 1000) * 1000

/** Giá thấp nhất đang bán của một đầu sách (đã tính sẵn từ các tin đăng) — thẻ sách hiện "từ ...đ" */
export const unitPrice = (book: Book): number => book.price

/** Giá BookWise tự bán sách trong kho của mình theo tình trạng */
export const storePrice = (book: Pick<Book, 'listPrice'>, condition: ConditionId) => roundThousand(book.listPrice * CONDITIONS[condition].factor)

/** Giá trần người bán được đăng, giữ sách rẻ cho sinh viên */
export const priceCap = (book: Pick<Book, 'listPrice'>, condition: ConditionId) => roundThousand(book.listPrice * CONDITIONS[condition].cap)

export function buybackQuote(book: Pick<Book, 'listPrice'>, condition: ConditionId): number {
  return roundThousand(book.listPrice * BUYBACK_RATE[condition])
}

/** Phần trăm rẻ hơn giá bìa */
export const savingPercent = (price: number, listPrice: number) => (listPrice > 0 ? Math.round((1 - price / listPrice) * 100) : 0)

/** "Siêu rẻ": đang có cuốn bán từ 40% giá bìa trở xuống */
export const isOnDeal = (book: Book) => book.stock > 0 && book.price <= book.listPrice * 0.4
