// Quy tắc giá dùng chung cho giỏ hàng, đặt hàng, đăng bán và thu mua. Khớp với src/models/pricing.ts ở front-end.
// BookWise chỉ bán sách cũ: giá tính theo giá bìa (list_price) nhân hệ số tình trạng.

export const CONDITIONS = {
  likenew: { label: 'Như mới · 95%', factor: 0.55, cap: 0.7 },
  used: { label: 'Đã qua sử dụng · 80%', factor: 0.4, cap: 0.55 },
}
export const CONDITION_FACTORS = Object.fromEntries(Object.entries(CONDITIONS).map(([k, v]) => [k, v.factor]))
export const BUYBACK_RATES = { likenew: 0.3, used: 0.2 }
export const COMMISSION_RATE = 0.1
export const MIN_LISTING_PRICE = 10000
export const MAX_LISTING_QTY = 20
export const MAX_QTY_PER_LINE = 99
export const BOOKWISE_SELLER = 'bookwise'

export const roundThousand = (n) => Math.round(n / 1000) * 1000

const listPriceOf = (book) => book.list_price ?? book.listPrice ?? book.price

/** Giá BookWise tự bán theo tình trạng */
export const storePrice = (book, condition = 'used') => roundThousand(listPriceOf(book) * CONDITIONS[condition].factor)

/** Giá trần người bán được đăng */
export const priceCap = (book, condition) => roundThousand(listPriceOf(book) * CONDITIONS[condition].cap)

/** Giữ tên cũ cho các controller đang dùng */
export const unitPrice = storePrice

export const buybackQuote = (book, condition) => roundThousand(listPriceOf(book) * BUYBACK_RATES[condition])

/** Người bán nhận về sau khi trừ phí dịch vụ */
export const payoutOf = (price) => price - Math.round(price * COMMISSION_RATE)

/** Kiểm tra một dòng hàng từ client, trả về { listingId?, bookId, condition, qty } hoặc thông báo lỗi. */
export function parseItem(item) {
  const condition = item?.condition ?? 'used'
  if (!item?.bookId && !item?.listingId) return { error: 'Thiếu mã sách' }
  if (!(condition in CONDITIONS)) return { error: `Tình trạng sách "${condition}" không hợp lệ` }
  const qty = Number(item.qty ?? 1)
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) return { error: `Số lượng phải là số nguyên từ 1 đến ${MAX_QTY_PER_LINE}` }
  return { listingId: item.listingId ? String(item.listingId) : null, bookId: item.bookId ? String(item.bookId) : null, condition, qty }
}

/** Kiểm tra tin đăng của người bán, trả về chuỗi lỗi hoặc null */
export function validateListing({ condition, price, qty, note = '' }, book) {
  if (!book) return 'Đầu sách không tồn tại'
  if (!(condition in CONDITIONS)) return 'Tình trạng sách không hợp lệ'
  if (!Number.isInteger(price) || price < MIN_LISTING_PRICE) return `Giá tối thiểu ${MIN_LISTING_PRICE.toLocaleString('vi-VN')}đ`
  const cap = priceCap(book, condition)
  if (price > cap) return `Giá vượt mức trần ${cap.toLocaleString('vi-VN')}đ (${CONDITIONS[condition].cap * 100}% giá bìa)`
  if (!Number.isInteger(qty) || qty < 0 || qty > MAX_LISTING_QTY) return `Số lượng từ 0 đến ${MAX_LISTING_QTY}`
  if (String(note).length > 300) return 'Mô tả tối đa 300 ký tự'
  return null
}

const couponGroup = (c) => (c.kind === 'shipping' ? 'shipping' : 'order')

/**
 * Tính giảm giá: mỗi nhóm (tiền hàng / phí ship) chỉ dùng một mã, mã sau thay mã trước,
 * mã không đủ điều kiện bị bỏ qua. Tiền giảm không vượt quá tạm tính và phí ship.
 */
export function applyCoupons(coupons, subtotal, shippingFee) {
  const byGroup = new Map()
  for (const c of coupons) if (c && subtotal >= c.min_subtotal) byGroup.set(couponGroup(c), c)

  let discount = 0
  let shippingDiscount = 0
  for (const c of byGroup.values()) {
    if (c.kind === 'fixed') discount += c.value
    if (c.kind === 'percent') discount += Math.min(Math.round((subtotal * c.value) / 100), c.cap ?? Infinity)
    if (c.kind === 'shipping') shippingDiscount += c.value
  }
  discount = Math.min(discount, subtotal)
  shippingDiscount = Math.min(shippingDiscount, shippingFee)
  return { discount, shippingDiscount, applied: [...byGroup.values()] }
}
