// Nguồn dữ liệu thời gian thực cho trang quản trị.
// 1) liveTraffic: lưu lượng mô phỏng, chỉ chạy khi có màn hình đang theo dõi.
// 2) presence: các tab BookWise THẬT đang mở trên trình duyệt này, trao đổi qua BroadcastChannel.

import { TICK_MS, nextSnapshot, warmSnapshot, type LiveSnapshot } from '../models/live'
import { catalogStore } from './listingRepository'

type Listener = () => void

function createLiveTraffic() {
  const listeners = new Set<Listener>()
  let snapshot: LiveSnapshot | null = null
  let timer: number | undefined

  const tick = () => {
    snapshot = nextSnapshot(snapshot, catalogStore.get(), Date.now())
    listeners.forEach((l) => l())
  }

  return {
    get: (): LiveSnapshot => (snapshot ??= warmSnapshot(catalogStore.get(), Date.now())),
    subscribe(listener: Listener) {
      listeners.add(listener)
      if (listeners.size === 1) timer = window.setInterval(tick, TICK_MS)
      return () => {
        listeners.delete(listener)
        if (!listeners.size) window.clearInterval(timer)
      }
    },
  }
}

export const liveTraffic = createLiveTraffic()

// ---------------------------------------------------------------------------

export interface PresenceTab {
  id: string
  path: string
  role: 'guest' | 'customer' | 'admin'
  seen: number
}

const HEARTBEAT_MS = 5000
const EXPIRE_MS = 15_000

function createPresence() {
  const id = Math.random().toString(36).slice(2, 10)
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('bookwise:presence')
  const tabs = new Map<string, PresenceTab>()
  const listeners = new Set<Listener>()
  let list: PresenceTab[] = []
  let me: Omit<PresenceTab, 'seen'> = { id, path: '/', role: 'guest' }

  const emit = () => {
    list = [...tabs.values()].sort((a, b) => b.seen - a.seen)
    listeners.forEach((l) => l())
  }
  const post = (msg: unknown) => channel?.postMessage(msg)

  channel?.addEventListener('message', (e: MessageEvent) => {
    const msg = e.data as { type: 'beat' | 'leave' | 'hello'; tab?: Omit<PresenceTab, 'seen'>; id?: string }
    if (msg.type === 'hello') return post({ type: 'beat', tab: me })
    if (msg.type === 'leave' && msg.id) tabs.delete(msg.id)
    if (msg.type === 'beat' && msg.tab) tabs.set(msg.tab.id, { ...msg.tab, seen: Date.now() })
    emit()
  })

  window.setInterval(() => {
    post({ type: 'beat', tab: me })
    const now = Date.now()
    let changed = false
    for (const [k, t] of tabs) if (now - t.seen > EXPIRE_MS) changed = tabs.delete(k)
    if (changed) emit()
  }, HEARTBEAT_MS)
  window.addEventListener('pagehide', () => post({ type: 'leave', id }))
  post({ type: 'hello' })

  return {
    supported: !!channel,
    /** Tab hiện tại báo vị trí mới cho các tab khác */
    announce(path: string, role: PresenceTab['role']) {
      me = { id, path, role }
      post({ type: 'beat', tab: me })
    },
    /** Các tab khác (không gồm tab đang xem) */
    get: () => list,
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export const presence = createPresence()
