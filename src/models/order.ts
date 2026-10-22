import { ORDER_FLOW } from '../data/catalog'
import type { Order, OrderStatus } from './types'

export const nextStatus = (s: OrderStatus): OrderStatus | null => {
  const i = ORDER_FLOW.indexOf(s)
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null
}

/** Khách chỉ được tự huỷ khi đơn chưa được xác nhận; admin huỷ được tới trước khi giao xong. */
export const customerCanCancel = (o: Order) => o.status === 'pending'
export const adminCanCancel = (o: Order) => o.status !== 'delivered' && o.status !== 'cancelled'

export const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: 'Xác nhận đơn',
  confirmed: 'Giao cho vận chuyển',
  shipping: 'Đánh dấu đã giao',
}

export const itemCount = (o: Order) => o.items.reduce((s, i) => s + i.qty, 0)

export const generateCode = (prefix: string, digits: number, taken: (code: string) => boolean) => {
  let code: string
  do {
    code = `${prefix}-${Math.floor(10 ** (digits - 1) + Math.random() * 9 * 10 ** (digits - 1))}`
  } while (taken(code))
  return code
}
