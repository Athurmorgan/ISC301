import { formatMoney } from './format'
import { isBuyable } from './listing'
import { fail, ok } from './result'
import type { Book, CartItem, CartLine, Coupon, Listing, Result, ShippingMethod, Totals } from './types'

/** Tìm mã trong danh sách đang có hiệu lực (do quản trị viên quản lý). */
export const findCoupon = (coupons: Coupon[], code: string) => coupons.find((c) => c.code === code.trim().toUpperCase())

/** Mã giảm phí ship và mã giảm tiền hàng thuộc hai nhóm khác nhau, mỗi nhóm dùng một mã. */
const couponGroup = (c: Coupon) => (c.kind === 'shipping' ? 'shipping' : 'order')

/** Giỏ lưu theo tin đăng; tin đã hết hoặc bị ẩn sẽ tự rơi khỏi giỏ */
export function buildLines(items: CartItem[], books: Book[], listings: Listing[]): CartLine[] {
  return items.flatMap((item) => {
    const book = books.find((b) => b.id === item.bookId)
    const listing = listings.find((l) => l.id === item.listingId)
    if (!book || !listing || !isBuyable(listing)) return []
    const qty = Math.min(item.qty, listing.qty)
    return [{ ...item, qty, condition: listing.condition, book, listing, unitPrice: listing.price, lineTotal: listing.price * qty }]
  })
}

export const quantityInCart = (items: CartItem[], listingId: string) => items.find((i) => i.listingId === listingId)?.qty ?? 0

/** Thêm sách của một tin đăng vào giỏ, không vượt số cuốn người bán còn. */
export function addItem(items: CartItem[], listing: Listing, qty: number, buyer?: string | null): Result<CartItem[]> {
  if (buyer && listing.sellerId === buyer) return fail('Đây là sách bạn đang đăng bán')
  if (!isBuyable(listing)) return fail('Tin đăng này đã hết sách')
  if (quantityInCart(items, listing.id) + qty > listing.qty) return fail(`Người bán chỉ còn ${listing.qty} cuốn`)
  const exists = items.some((i) => i.listingId === listing.id)
  return ok(
    exists
      ? items.map((i) => (i.listingId === listing.id ? { ...i, qty: i.qty + qty } : i))
      : [...items, { listingId: listing.id, bookId: listing.bookId, condition: listing.condition, qty }],
  )
}

export function setItemQty(items: CartItem[], listing: Listing, qty: number): CartItem[] {
  const next = Math.min(Math.max(0, Math.floor(qty)), listing.qty)
  if (next === 0) return items.filter((i) => i.listingId !== listing.id)
  return items.map((i) => (i.listingId === listing.id ? { ...i, qty: next } : i))
}

/** Kiểm tra và áp mã; trả về danh sách mã mới (thay mã cùng nhóm nếu có). */
export function applyCoupon(coupons: Coupon[], applied: string[], code: string, subtotal: number): Result<string[]> {
  const coupon = findCoupon(coupons, code)
  if (!code.trim()) return fail('Nhập mã giảm giá')
  if (!coupon) return fail('Mã giảm giá không tồn tại')
  if (subtotal < coupon.minSubtotal) return fail(`Mã ${coupon.code} cần đơn từ ${formatMoney(coupon.minSubtotal)}`)
  const others = applied.filter((c) => {
    const existing = findCoupon(coupons, c)
    return existing && couponGroup(existing) !== couponGroup(coupon)
  })
  return ok([...others, coupon.code])
}

export function computeTotals(lines: CartLine[], couponCodes: string[], shipping: ShippingMethod, coupons: Coupon[]): Totals {
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const listTotal = lines.reduce((s, l) => s + l.book.listPrice * l.qty, 0)
  const shippingFee = lines.length ? shipping.fee : 0

  // Mã không còn đủ điều kiện (vd. đã bớt sách) sẽ tự động không được tính
  const appliedCoupons = couponCodes.map((code) => findCoupon(coupons, code)).filter((c): c is Coupon => !!c && subtotal >= c.minSubtotal)

  let discount = 0
  let shippingDiscount = 0
  for (const c of appliedCoupons) {
    if (c.kind === 'fixed') discount += c.value
    if (c.kind === 'percent') discount += Math.min(Math.round((subtotal * c.value) / 100), c.cap ?? Infinity)
    if (c.kind === 'shipping') shippingDiscount += Math.min(c.value, shippingFee)
  }
  discount = Math.min(discount, subtotal)

  return {
    lines,
    itemCount: lines.reduce((s, l) => s + l.qty, 0),
    subtotal,
    listTotal,
    discount,
    shippingFee,
    shippingDiscount,
    total: subtotal - discount + shippingFee - shippingDiscount,
    appliedCoupons,
  }
}
