import { PAYMENTS, SHIPPING, STATUS_HINT } from '../data/catalog'
import { buildLines, computeTotals } from '../models/cart'
import { generateCode } from '../models/order'
import { fail, ok } from '../models/result'
import type { Address, Order, OrderStatus, PaymentId, Result, ShippingId } from '../models/types'
import { bookRepository } from './bookRepository'
import { cartRepository } from './cartRepository'
import { orderRepository } from './orderRepository'

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
  const totals = computeTotals(buildLines(cartRepository.items(), bookRepository.all()), cartRepository.coupons(), shipping)
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
