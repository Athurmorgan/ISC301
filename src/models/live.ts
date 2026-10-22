// Số liệu thời gian thực cho trang quản trị.
// - Lưu lượng truy cập (người online, nguồn, thiết bị, khu vực, hoạt động) là MÔ PHỎNG vì chưa có backend:
//   mô hình bước ngẫu nhiên bám theo đường cong giờ trong ngày của một nhà sách online tại Việt Nam.
// - Đơn hàng và doanh thu tính từ đơn THẬT trong hệ thống.

import { CONDITIONS } from '../data/catalog'
import { formatMoney } from './format'
import { unitPrice } from './pricing'
import type { Book, ConditionId, Order } from './types'

export type Rng = () => number

export const TICK_MS = 3000
export const HISTORY_SIZE = 40

export type LiveEventKind = 'view' | 'cart' | 'search' | 'checkout' | 'signup' | 'review'

export interface LiveEvent {
  id: number
  at: number
  kind: LiveEventKind
  text: string
  region: string
}

export interface Share {
  label: string
  count: number
}

export interface LiveSnapshot {
  at: number
  visitors: number
  /** Số người online qua các nhịp gần nhất (cũ → mới) */
  history: number[]
  sessionsToday: number
  pageviewsToday: number
  browsing: number
  carts: number
  checkout: number
  pages: (Share & { to: string })[]
  sources: Share[]
  devices: Share[]
  regions: Share[]
  events: LiveEvent[]
}

/** Lượng người online trung bình theo giờ (0h → 23h): thấp nhất rạng sáng, cao nhất 20–21h */
const HOURLY = [34, 22, 14, 10, 9, 14, 30, 58, 82, 96, 108, 120, 132, 124, 112, 116, 126, 142, 164, 190, 214, 206, 156, 86]

const SOURCES: [string, number][] = [
  ['Google', 36],
  ['Facebook', 22],
  ['TikTok', 17],
  ['Truy cập trực tiếp', 13],
  ['Zalo', 7],
  ['Email', 5],
]
const DEVICES: [string, number][] = [
  ['Điện thoại', 69],
  ['Máy tính', 27],
  ['Máy tính bảng', 4],
]
const REGIONS: [string, number][] = [
  ['TP. Hồ Chí Minh', 34],
  ['Hà Nội', 29],
  ['Đà Nẵng', 8],
  ['Hải Phòng', 5],
  ['Cần Thơ', 5],
  ['Tỉnh thành khác', 19],
]
const SEARCHES = ['tâm lý học', 'sách kinh tế', 'Haruki Murakami', 'đắc nhân tâm', 'sapiens', 'sách cũ giá rẻ', 'nguyễn nhật ánh', 'đầu tư chứng khoán', 'thói quen', 'tiểu thuyết']

const EVENT_WEIGHTS: [LiveEventKind, number][] = [
  ['view', 42],
  ['cart', 22],
  ['search', 16],
  ['checkout', 10],
  ['review', 5],
  ['signup', 5],
]

export function baselineAt(now: number): number {
  const d = new Date(now)
  const h = d.getHours() + d.getMinutes() / 60
  const a = HOURLY[Math.floor(h) % 24]
  const b = HOURLY[(Math.floor(h) + 1) % 24]
  return a + (b - a) * (h - Math.floor(h))
}

/** Tổng phiên từ 0h tới giờ, ước lượng từ đường cong (phiên trung bình ~4 phút) */
function sessionsSoFar(now: number): number {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  let total = 0
  for (let t = start.getTime(); t < now; t += 60_000) total += baselineAt(t) / 4
  return Math.round(total)
}

const pick = <T>(rng: Rng, list: T[]) => list[Math.floor(rng() * list.length)]

function weighted<T>(rng: Rng, list: [T, number][]): T {
  const total = list.reduce((s, [, w]) => s + w, 0)
  let r = rng() * total
  for (const [v, w] of list) if ((r -= w) < 0) return v
  return list[list.length - 1][0]
}

/** Chia `total` theo tỉ trọng có nhiễu nhẹ; tổng các phần luôn bằng `total` */
function distribute(rng: Rng, total: number, weights: [string, number][]): Share[] {
  const noisy = weights.map(([label, w]) => [label, w * (0.85 + rng() * 0.3)] as const)
  const sum = noisy.reduce((s, [, w]) => s + w, 0)
  const raw = noisy.map(([label, w]) => ({ label, exact: (w / sum) * total }))
  const out = raw.map((r) => ({ label: r.label, count: Math.floor(r.exact) }))
  let rest = total - out.reduce((s, o) => s + o.count, 0)
  const order = raw.map((r, i) => ({ i, frac: r.exact - Math.floor(r.exact) })).sort((a, b) => b.frac - a.frac)
  for (const { i } of order) {
    if (rest-- <= 0) break
    out[i].count++
  }
  return out
}

function pagesFor(rng: Rng, visitors: number, books: Book[]): LiveSnapshot['pages'] {
  const hot = [...books].sort((a, b) => b.sold - a.sold).slice(0, 5)
  const weights: [string, number][] = [
    ['Trang chủ', 26],
    ['Tủ sách', 20],
    ...hot.map((b, i): [string, number] => [b.title, 9 - i * 1.2]),
    ['Giỏ hàng', 6],
    ['Thanh toán', 4],
    ['Tra cứu đơn', 3],
  ]
  const link = (label: string) =>
    label === 'Trang chủ' ? '/' : label === 'Tủ sách' ? '/sach' : label === 'Giỏ hàng' ? '/gio-hang' : label === 'Thanh toán' ? '/thanh-toan' : label === 'Tra cứu đơn' ? '/don-hang' : `/sach/${hot.find((b) => b.title === label)?.id}`
  return distribute(rng, visitors, weights)
    .map((s) => ({ ...s, to: link(s.label) }))
    .sort((a, b) => b.count - a.count)
}

function makeEvent(rng: Rng, id: number, at: number, books: Book[]): LiveEvent {
  const kind = weighted(rng, EVENT_WEIGHTS)
  const region = weighted(rng, REGIONS.slice(0, -1))
  const book = pick(rng, books)
  const condition = pick(rng, Object.keys(CONDITIONS) as ConditionId[])
  const text = {
    view: `đang xem “${book.title}”`,
    cart: `thêm “${book.title}” (${CONDITIONS[condition].label}) vào giỏ`,
    search: `tìm “${pick(rng, SEARCHES)}”`,
    checkout: `bắt đầu thanh toán ${formatMoney(Math.round((unitPrice(book, condition) * (1 + Math.floor(rng() * 3))) / 1000) * 1000 + 15_000)}`,
    review: `đánh giá ${4 + Math.round(rng())} sao cho “${book.title}”`,
    signup: 'vừa tạo tài khoản mới',
  }[kind]
  return { id, at, kind, text, region }
}

let eventSeq = 0

/** Nhịp kế tiếp: số người online trôi về đường cong của giờ hiện tại, cộng nhiễu */
export function nextSnapshot(prev: LiveSnapshot | null, books: Book[], now: number, rng: Rng = Math.random): LiveSnapshot {
  const target = baselineAt(now)
  const last = prev?.visitors ?? Math.round(target)
  const visitors = Math.max(3, Math.round(last + (target - last) * 0.2 + (rng() - 0.5) * Math.max(6, target * 0.08)))

  const browsing = Math.round(visitors * (0.55 + rng() * 0.08))
  const carts = Math.round(visitors * (0.12 + rng() * 0.03))
  const checkout = Math.max(0, Math.round(visitors * (0.035 + rng() * 0.015)))

  const newSessions = prev ? Math.max(0, Math.round((visitors / 80) * (0.6 + rng() * 0.8))) : 0
  const sessionsToday = prev ? prev.sessionsToday + newSessions : sessionsSoFar(now)
  const pageviewsToday = prev ? prev.pageviewsToday + Math.round(visitors * (0.05 + rng() * 0.04)) : Math.round(sessionsToday * 3.7)

  const fresh = books.length ? Array.from({ length: rng() < 0.25 ? 0 : rng() < 0.7 ? 1 : 2 }, (_, i) => makeEvent(rng, ++eventSeq, now - i * 700, books)) : []

  return {
    at: now,
    visitors,
    history: [...(prev?.history ?? []), visitors].slice(-HISTORY_SIZE),
    sessionsToday,
    pageviewsToday,
    browsing,
    carts,
    checkout,
    pages: pagesFor(rng, visitors, books),
    sources: distribute(rng, visitors, SOURCES),
    devices: distribute(rng, visitors, DEVICES),
    regions: distribute(rng, visitors, REGIONS),
    events: [...fresh, ...(prev?.events ?? [])].slice(0, 14),
  }
}

/** Khởi tạo kèm lịch sử để biểu đồ có dữ liệu ngay khi mở trang */
export function warmSnapshot(books: Book[], now: number, rng: Rng = Math.random): LiveSnapshot {
  let snap: LiveSnapshot | null = null
  for (let i = HISTORY_SIZE - 1; i >= 0; i--) snap = nextSnapshot(snap, books, now - i * TICK_MS, rng)
  return snap!
}

// ---------------------------------------------------------------------------
// Số liệu thật từ đơn hàng

export interface OrderPulse {
  todayCount: number
  todayRevenue: number
  todayBooks: number
  lastHourCount: number
  pending: number
  averageOrder: number
  /** Số đơn theo từng giờ hôm nay (0h → 23h) */
  byHour: number[]
  latest: Order[]
}

export function orderPulse(orders: Order[], now = Date.now()): OrderPulse {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const today = orders.filter((o) => o.status !== 'cancelled' && Date.parse(o.createdAt) >= start.getTime())
  const revenue = today.reduce((s, o) => s + o.total, 0)
  const byHour = Array<number>(24).fill(0)
  for (const o of today) byHour[new Date(o.createdAt).getHours()]++
  return {
    todayCount: today.length,
    todayRevenue: revenue,
    todayBooks: today.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0),
    lastHourCount: today.filter((o) => now - Date.parse(o.createdAt) <= 3_600_000).length,
    pending: orders.filter((o) => o.status === 'pending').length,
    averageOrder: today.length ? Math.round(revenue / today.length) : 0,
    byHour,
    latest: [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6),
  }
}

export function timeAgo(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 5) return 'vừa xong'
  if (s < 60) return `${s} giây trước`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} phút trước`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} giờ trước` : `${Math.round(h / 24)} ngày trước`
}
