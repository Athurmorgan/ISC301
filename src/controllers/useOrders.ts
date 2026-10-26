import { useEffect, useMemo, useState } from 'react'
import { STATUS_HINT, STATUS_LABEL } from '../data/catalog'
import { customerCanCancel, nextStatus } from '../models/order'
import type { Order, OrderStatus } from '../models/types'
import { listingRepository } from '../services/listingRepository'
import { offersFor } from '../models/listing'
import { userRepository } from '../services/userRepository'
import { cartRepository } from '../services/cartRepository'
import { orderRepository, ordersStore } from '../services/orderRepository'
import { API_ENABLED, api, isNetworkError } from '../services/apiClient'
import { changeStatus, pushStatus } from '../services/orderService'
import { markOffline, toOrder } from '../services/syncService'
import { notify, notifyError } from '../services/toastService'
import { addItem } from '../models/cart'
import { useStore } from './useStore'

/** Báo lên máy chủ; lỗi chỉ hiện cảnh báo vì trên máy đã cập nhật xong */
function syncRemote(order: Order, status: OrderStatus, note: string, by: 'customer' | 'admin') {
  void pushStatus(order, status, note, by).then((err) => err && notifyError(`Máy chủ chưa cập nhật: ${err}`))
}

export const useAllOrders = () => useStore(ordersStore)

export function useOrder(code: string | null) {
  const orders = useAllOrders()
  return useMemo(() => (code ? orders.find((o) => o.code === code.trim().toUpperCase()) : undefined), [orders, code])
}

/** Lấy đơn từ máy chủ; đơn xem được đầy đủ thì lưu vào máy để các trang khác dùng chung */
async function fetchRemoteOrder(code: string, phone?: string): Promise<{ order: Order; masked: boolean } | null> {
  try {
    const { order, items, timeline } = await api.orders.track(code, phone)
    const full = toOrder(order, items, timeline)
    if (!order.masked && !orderRepository.find(full.code)) orderRepository.insert(full)
    return { order: full, masked: !!order.masked }
  } catch (e) {
    if (isNetworkError(e)) markOffline()
    return null
  }
}

/**
 * Đơn không có trên trình duyệt này (đặt ở máy khác) thì hỏi máy chủ.
 * Trả về đơn đã che thông tin nếu người xem chưa chứng minh là chủ đơn.
 */
export function useRemoteOrder(code: string | null, local: Order | undefined) {
  const [remote, setRemote] = useState<{ code: string; order: Order | null } | null>(null)
  const key = code?.trim().toUpperCase() ?? ''
  const needed = API_ENABLED && !!key && !local

  useEffect(() => {
    if (!needed) return
    let alive = true
    void fetchRemoteOrder(key).then((r) => alive && setRemote({ code: key, order: r?.order ?? null }))
    return () => {
      alive = false
    }
  }, [needed, key])

  const current = remote?.code === key ? remote : null
  return {
    order: needed ? (current?.order ?? undefined) : undefined,
    loading: needed && !current,
    /** Hỏi máy chủ với 4 số cuối SĐT; đúng thì đơn đầy đủ được lưu vào máy */
    verifyPhone: async (hint: string) => {
      const r = await fetchRemoteOrder(key, hint)
      return !!r && !r.masked
    },
  }
}

export function useOrderActions() {
  return {
    cancelByCustomer(order: Order) {
      if (!customerCanCancel(order)) return notifyError('Đơn đã được xác nhận, vui lòng liên hệ CSKH để huỷ')
      const r = changeStatus(order.code, 'cancelled', 'Khách hàng huỷ đơn')
      if (!r.ok) return notifyError(r.error)
      notify(`Đã huỷ đơn ${order.code}`)
      syncRemote(order, 'cancelled', 'Khách hàng huỷ đơn', 'customer')
    },
    advance(order: Order) {
      const next = nextStatus(order.status)
      if (!next) return
      const r = changeStatus(order.code, next)
      if (!r.ok) return notifyError(r.error)
      notify(`${order.code} → ${STATUS_LABEL[next]}`)
      syncRemote(order, next, STATUS_HINT[next], 'admin')
    },
    cancelByAdmin(order: Order) {
      const r = changeStatus(order.code, 'cancelled', 'Huỷ bởi BookWise')
      if (!r.ok) return notifyError(r.error)
      notify(`Đã huỷ đơn ${order.code} và hoàn kho`)
      syncRemote(order, 'cancelled', 'Huỷ bởi BookWise', 'admin')
    },
    /** Đưa lại các sách của đơn cũ vào giỏ: ưu tiên đúng tin cũ, hết thì lấy tin rẻ nhất cùng đầu sách */
    reorder(order: Order): number {
      let items = cartRepository.items()
      let added = 0
      const me = userRepository.sessionEmail()
      for (const i of order.items) {
        const same = i.listingId ? listingRepository.find(i.listingId) : undefined
        const listing = same && same.status === 'active' && same.qty >= i.qty ? same : offersFor(listingRepository.all(), i.bookId).find((l) => l.qty >= i.qty && l.sellerId !== me)
        if (!listing) continue
        const r = addItem(items, listing, i.qty, me)
        if (r.ok) {
          items = r.value
          added += i.qty
        }
      }
      cartRepository.save(items)
      if (added) notify(`Đã thêm ${added} cuốn vào giỏ`, { action: { label: 'Xem giỏ', to: '/gio-hang' } })
      else notifyError('Các sách trong đơn hiện đã hết hàng')
      return added
    },
  }
}
