import { PAYMENTS, SHIPPING, STATUS_HINT } from '../data/catalog'
import { buildLines, computeTotals } from '../models/cart'
import { couponRepository } from './couponRepository'
import { generateCode } from '../models/order'
import { fail, ok } from '../models/result'
import type { Address, Order, OrderStatus, PaymentId, Result, ShippingId } from '../models/types'
import { API_ENABLED, api, errorMessage, isNetworkError, tokenStore } from './apiClient'
import { bookRepository } from './bookRepository'
import { cartRepository } from './cartRepository'
import { orderRepository } from './orderRepository'
import { markOffline, syncBooks } from './syncService'

export interface PlaceOrderInput {
  customer: Address
  shippingId: ShippingId
  paymentId: PaymentId
  note: string
  userEmail: string | null
}

/** Tạo đơn từ giỏ hiện tại: kiểm tra kho, trừ kho, lưu đơn, xoá giỏ. */
export function placeOrder(input: PlaceOrderInput): Result<Order> {
  const shipping = SHIPPING.find((s) => s.id === input.shippingId)!
  if (shipping.provinces && !shipping.provinces.includes(input.customer.province)) {
    return fail(`${shipping.name} chỉ áp dụng tại ${shipping.provinces.join(' và ')}`)
  }
  const totals = computeTotals(buildLines(cartRepository.items(), bookRepository.all()), cartRepository.coupons(), shipping, couponRepository.all())
  if (!totals.lines.length) return fail('Giỏ hàng đang trống')

  const items = totals.lines.map((l) => ({
    bookId: l.book.id,
    title: l.book.title,
    author: l.book.author,
    cover: l.book.cover,
    category: l.book.category,
    condition: l.condition,
    unitPrice: l.unitPrice,
    qty: l.qty,
  }))
  const reserved = bookRepository.reserve(items)
  if (!reserved.ok) return reserved

  const now = new Date().toISOString()
  const payment = PAYMENTS.find((p) => p.id === input.paymentId)!
  const paid = payment.id !== 'cod'
  const order: Order = {
    code: generateCode('BW', 6, (c) => !!orderRepository.find(c)),
    createdAt: now,
    userEmail: input.userEmail,
    customer: input.customer,
    note: input.note.trim(),
    items,
    shipping: { id: shipping.id, name: shipping.name, fee: totals.shippingFee },
    payment: { id: payment.id, name: payment.name, paid },
    coupons: totals.appliedCoupons.map((c) => c.code),
    subtotal: totals.subtotal,
    discount: totals.discount,
    shippingDiscount: totals.shippingDiscount,
    total: totals.total,
    status: 'pending',
    history: [{ status: 'pending', at: now, note: paid ? 'Đã nhận thanh toán, chờ xác nhận' : 'Đơn thanh toán khi nhận hàng' }],
  }
  orderRepository.insert(order)
  cartRepository.clear()
  return ok(order)
}

export function changeStatus(code: string, status: OrderStatus, note = STATUS_HINT[status]): Result<undefined> {
  const order = orderRepository.find(code)
  if (!order) return fail('Không tìm thấy đơn hàng')
  if (order.status === 'cancelled' || order.status === 'delivered') return fail('Đơn đã kết thúc, không thể đổi trạng thái')
  if (status === 'cancelled') bookRepository.release(order.items)

  orderRepository.update(code, (o) => ({
    ...o,
    status,
    // Đơn COD được tính là đã thanh toán khi giao thành công
    payment: status === 'delivered' ? { ...o.payment, paid: true } : o.payment,
    history: [...o.history, { status, at: new Date().toISOString(), note }],
  }))
  return ok(undefined)
}

/** OTP thử nghiệm mà cổng thẻ giả lập của máy chủ chấp nhận (khớp với PaymentModal) */
const DEMO_OTP = '123456'

/**
 * Đặt hàng qua máy chủ: máy chủ tính lại giá, trừ kho và cấp mã đơn; sau đó ghi nhận thanh toán.
 * Đơn được lưu thêm một bản trên máy để trang tra cứu, tài khoản và quản trị dùng như trước.
 * Không kết nối được máy chủ thì đặt hàng offline bằng placeOrder.
 */
export async function placeOrderOnline(input: PlaceOrderInput): Promise<Result<Order>> {
  if (!API_ENABLED) return placeOrder(input)
  const shipping = SHIPPING.find((s) => s.id === input.shippingId)!
  const totals = computeTotals(buildLines(cartRepository.items(), bookRepository.all()), cartRepository.coupons(), shipping, couponRepository.all())
  if (!totals.lines.length) return fail('Giỏ hàng đang trống')

  let created
  try {
    created = await api.orders.checkout({
      customer: input.customer,
      items: totals.lines.map((l) => ({ bookId: l.book.id, condition: l.condition, qty: l.qty })),
      shippingId: input.shippingId,
      paymentId: input.paymentId,
      couponCodes: totals.appliedCoupons.map((c) => c.code),
      note: input.note,
    })
  } catch (e) {
    if (!isNetworkError(e)) return fail(errorMessage(e))
    markOffline()
    return placeOrder(input)
  }

  let paid = false
  let payNote = 'Đơn thanh toán khi nhận hàng'
  if (input.paymentId !== 'cod') {
    try {
      await api.orders.pay(created.orderCode, input.paymentId === 'card' ? { otp: DEMO_OTP } : { confirm: true })
      paid = true
      payNote = 'Đã nhận thanh toán, chờ xác nhận'
    } catch (e) {
      payNote = `Chưa xác nhận được thanh toán: ${errorMessage(e)}`
    }
  }

  const items = totals.lines.map((l) => ({
    bookId: l.book.id,
    title: l.book.title,
    author: l.book.author,
    cover: l.book.cover,
    category: l.book.category,
    condition: l.condition,
    unitPrice: l.unitPrice,
    qty: l.qty,
  }))
  const payment = PAYMENTS.find((p) => p.id === input.paymentId)!
  const order: Order = {
    code: created.orderCode,
    createdAt: created.createdAt,
    userEmail: input.userEmail,
    customer: input.customer,
    note: input.note.trim(),
    items,
    shipping: { id: shipping.id, name: shipping.name, fee: created.shippingFee },
    payment: { id: payment.id, name: payment.name, paid },
    coupons: created.appliedCoupons,
    subtotal: created.subtotal,
    discount: created.discount,
    shippingDiscount: created.shippingDiscount,
    total: created.total,
    status: 'pending',
    history: [{ status: 'pending', at: created.createdAt, note: payNote }],
  }
  // Trừ kho trên máy cho giao diện cập nhật ngay, rồi lấy lại số liệu chuẩn từ máy chủ
  bookRepository.reserve(items)
  orderRepository.insert(order)
  cartRepository.clear()
  void syncBooks()
  return ok(order)
}

/**
 * Gửi thay đổi trạng thái lên máy chủ sau khi đã cập nhật trên máy.
 * Đơn chỉ có trên máy (đặt lúc offline) sẽ bị máy chủ trả 404, bỏ qua.
 */
export async function pushStatus(order: Order, status: OrderStatus, note: string, by: 'customer' | 'admin'): Promise<string | null> {
  if (!API_ENABLED) return null
  try {
    if (by === 'customer') await api.orders.cancel(order.code, note, order.customer.phone)
    else if (tokenStore.get()) await api.orders.setStatus(order.code, status, note)
    else return null
    return null
  } catch (e) {
    if (isNetworkError(e)) {
      markOffline()
      return null
    }
    const err = e as { status?: number }
    return err.status === 404 ? null : errorMessage(e)
  }
}
