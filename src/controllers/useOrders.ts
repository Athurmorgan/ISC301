import { useMemo } from 'react'
import { STATUS_LABEL } from '../data/catalog'
import { customerCanCancel, nextStatus } from '../models/order'
import type { Order } from '../models/types'
import { bookRepository } from '../services/bookRepository'
import { cartRepository } from '../services/cartRepository'
import { ordersStore } from '../services/orderRepository'
import { changeStatus } from '../services/orderService'
import { notify, notifyError } from '../services/toastService'
import { addItem } from '../models/cart'
import { useStore } from './useStore'

export const useAllOrders = () => useStore(ordersStore)

export function useOrder(code: string | null) {
  const orders = useAllOrders()
  return useMemo(() => (code ? orders.find((o) => o.code === code.trim().toUpperCase()) : undefined), [orders, code])
}

export function useOrderActions() {
  return {
    cancelByCustomer(order: Order) {
      if (!customerCanCancel(order)) return notifyError('Đơn đã được xác nhận, vui lòng liên hệ CSKH để huỷ')
      const r = changeStatus(order.code, 'cancelled', 'Khách hàng huỷ đơn')
      r.ok ? notify(`Đã huỷ đơn ${order.code}`) : notifyError(r.error)
    },
    advance(order: Order) {
      const next = nextStatus(order.status)
      if (!next) return
      const r = changeStatus(order.code, next)
      r.ok ? notify(`${order.code} → ${STATUS_LABEL[next]}`) : notifyError(r.error)
    },
    cancelByAdmin(order: Order) {
      const r = changeStatus(order.code, 'cancelled', 'Huỷ bởi BookWise')
      r.ok ? notify(`Đã huỷ đơn ${order.code} và hoàn kho`) : notifyError(r.error)
    },
    /** Đưa lại các sách của đơn cũ vào giỏ (bỏ qua sách đã hết hàng) */
    reorder(order: Order): number {
      let items = cartRepository.items()
      let added = 0
      for (const i of order.items) {
        const book = bookRepository.find(i.bookId)
        if (!book) continue
        const r = addItem(items, book, i.condition, i.qty)
        if (r.ok) {
          items = r.value
          added += i.qty
        }
      }
      cartRepository.save(items)
      added ? notify(`Đã thêm ${added} cuốn vào giỏ`, { action: { label: 'Xem giỏ', to: '/gio-hang' } }) : notifyError('Các sách trong đơn hiện đã hết hàng')
      return added
    },
  }
}
