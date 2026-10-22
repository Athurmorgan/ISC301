import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { orderPulse } from '../models/live'
import { liveTraffic, presence } from '../services/liveService'
import { useAuth } from './useAuth'
import { useAllOrders } from './useOrders'

/** Lưu lượng truy cập mô phỏng, cập nhật mỗi 3 giây khi còn component theo dõi */
export const useLiveTraffic = () => useSyncExternalStore(liveTraffic.subscribe, liveTraffic.get)

/** Các tab BookWise thật khác đang mở trên trình duyệt này */
export const useOpenTabs = () => useSyncExternalStore(presence.subscribe, presence.get)

/** Đặt trong Layout: báo cho trang quản trị biết tab này đang ở trang nào */
export function usePresenceBeacon() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const role = user?.role ?? 'guest'
  useEffect(() => presence.announce(pathname, role), [pathname, role])
}

/** Số liệu đơn hàng thật trong ngày; tính lại theo mỗi nhịp `now` */
export function useOrderPulse(now: number) {
  const orders = useAllOrders()
  return useMemo(() => orderPulse(orders, now), [orders, now])
}
