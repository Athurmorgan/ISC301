// Quy tắc giá dùng chung cho giỏ hàng, đặt hàng và thu mua. Khớp với src/models/pricing.ts ở front-end.

export const CONDITION_FACTORS = { seal: 1, likenew: 0.8, used: 0.6 }
export const BUYBACK_RATES = { likenew: 0.45, used: 0.3 }
export const MAX_QTY_PER_LINE = 99

const roundThousand = (n) => Math.round(n / 1000) * 1000

/** Giá ưu đãi trong ngày chỉ áp cho bản mới; sách cũ tính theo giá bán × hệ số, làm tròn nghìn. */
export function unitPrice(book, condition = 'seal') {
  if (condition === 'seal') return book.deal_price ?? book.price
  return roundThousand(book.price * CONDITION_FACTORS[condition])
}

export const buybackQuote = (book, condition) => roundThousand(book.price * BUYBACK_RATES[condition])

/** Kiểm tra một dòng hàng từ client, trả về { bookId, condition, qty } hoặc thông báo lỗi. */
export function parseItem(item) {
  const condition = item?.condition ?? 'seal'
  if (!item?.bookId) return { error: 'Thiếu mã sách' }
  if (!(condition in CONDITION_FACTORS)) return { error: `Tình trạng sách "${condition}" không hợp lệ` }
  const qty = Number(item.qty ?? 1)
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) return { error: `Số lượng phải là số nguyên từ 1 đến ${MAX_QTY_PER_LINE}` }
  return { bookId: String(item.bookId), condition, qty }
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
