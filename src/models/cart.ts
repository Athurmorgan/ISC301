import { formatMoney } from './format'
import { unitPrice } from './pricing'
import { fail, ok } from './result'
import type { Book, CartItem, CartLine, ConditionId, Coupon, Result, ShippingMethod, Totals } from './types'

/** Tìm mã trong danh sách đang có hiệu lực (do quản trị viên quản lý). */
export const findCoupon = (coupons: Coupon[], code: string) => coupons.find((c) => c.code === code.trim().toUpperCase())

/** Mã giảm phí ship và mã giảm tiền hàng thuộc hai nhóm khác nhau, mỗi nhóm dùng một mã. */
const couponGroup = (c: Coupon) => (c.kind === 'shipping' ? 'shipping' : 'order')

export function buildLines(items: CartItem[], books: Book[]): CartLine[] {
  return items.flatMap((item) => {
    const book = books.find((b) => b.id === item.bookId)
    if (!book) return []
    const price = unitPrice(book, item.condition)
    return [{ ...item, book, unitPrice: price, lineTotal: price * item.qty }]
  })
}

export const quantityInCart = (items: CartItem[], bookId: string, except?: ConditionId) =>
  items.filter((i) => i.bookId === bookId && i.condition !== except).reduce((sum, i) => sum + i.qty, 0)

/** Thêm sách vào giỏ, không vượt tồn kho (tính cả các tình trạng khác của cùng đầu sách). */
export function addItem(items: CartItem[], book: Book, condition: ConditionId, qty: number): Result<CartItem[]> {
  if (book.stock === 0) return fail('Sách tạm hết hàng')
  if (quantityInCart(items, book.id) + qty > book.stock) return fail(`Chỉ còn ${book.stock} cuốn trong kho`)
  const exists = items.some((i) => i.bookId === book.id && i.condition === condition)
  return ok(
    exists
      ? items.map((i) => (i.bookId === book.id && i.condition === condition ? { ...i, qty: i.qty + qty } : i))
      : [...items, { bookId: book.id, condition, qty }],
  )
}

export function setItemQty(items: CartItem[], book: Book, condition: ConditionId, qty: number): CartItem[] {
  const max = Math.max(0, book.stock - quantityInCart(items, book.id, condition))
  const next = Math.min(Math.max(0, Math.floor(qty)), max)
  if (next === 0) return items.filter((i) => !(i.bookId === book.id && i.condition === condition))
  return items.map((i) => (i.bookId === book.id && i.condition === condition ? { ...i, qty: next } : i))
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
