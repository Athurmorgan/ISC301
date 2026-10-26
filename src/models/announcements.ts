import { CATEGORIES, COUPONS } from '../data/catalog'
import { formatMoney, formatNumber, percentOff } from './format'
import { isOnDeal } from './pricing'
import type { Book, Order } from './types'

export interface Announcement {
  id: string
  tag: string
  text: string
  to?: string
}

const DAY = 86_400_000

/** Số cuốn bán ra theo từng đầu sách trong 30 ngày, tính từ đơn thật chưa huỷ */
function soldLast30Days(orders: Order[], now: number) {
  const sold = new Map<string, number>()
  for (const o of orders) {
    if (o.status === 'cancelled' || now - Date.parse(o.createdAt) > 30 * DAY) continue
    for (const i of o.items) sold.set(i.bookId, (sold.get(i.bookId) ?? 0) + i.qty)
  }
  return sold
}

/**
 * Nội dung dải thông báo đầu trang, tính từ dữ liệu hiện có:
 * bán chạy nhất tháng (đơn thật cộng lượt bán gốc), ưu đãi sâu nhất, đánh giá cao nhất, mã giảm giá.
 */
export function buildAnnouncements(books: Book[], orders: Order[], now = Date.now()): Announcement[] {
  if (!books.length) return []
  const recent = soldLast30Days(orders, now)
  const score = (b: Book) => b.sold + (recent.get(b.id) ?? 0) * 50
  const byScore = [...books].sort((a, b) => score(b) - score(a))
  const best = byScore[0]

  const list: Announcement[] = [
    {
      id: 'best',
      tag: 'Bán chạy nhất tháng',
      text: `${best.title} · ${best.author} · ${formatNumber(best.sold + (recent.get(best.id) ?? 0))} cuốn đã bán`,
      to: `/sach/${best.id}`,
    },
  ]

  const deal = books.filter(isOnDeal).sort((a, b) => percentOff(b.price, b.listPrice) - percentOff(a.price, a.listPrice))[0]
  if (deal) {
    list.push({
      id: 'deal',
      tag: 'Siêu rẻ',
      text: `${deal.title} chỉ từ ${formatMoney(deal.price)}, rẻ hơn ${percentOff(deal.price, deal.listPrice)}% giá bìa`,
      to: '/sach?uu-dai=1',
    })
  }

  list.push({ id: 'sell', tag: 'Sinh viên bán sách', text: 'Đăng ký người bán, được duyệt là đăng tin bán giáo trình cũ ngay', to: '/tai-khoan?tab=seller' })

  list.push({ id: 'express', tag: 'Hỏa tốc', text: 'Giao trong 2 giờ tại Hà Nội và TP. Hồ Chí Minh', to: '/ho-tro' })

  const coupon = COUPONS[0]
  list.push({ id: 'coupon', tag: `Mã ${coupon.code}`, text: coupon.description, to: '/gio-hang' })

  for (const c of CATEGORIES) {
    const top = byScore.find((b) => b.category === c.id && b.id !== best.id)
    if (top) list.push({ id: `top-${c.id}`, tag: `Top ${c.name}`, text: `${top.title} · ${top.author}`, to: `/sach/${top.id}` })
  }

  const loved = [...books].filter((b) => b.ratingCount >= 50).sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount)[0]
  if (loved) {
    list.push({
      id: 'loved',
      tag: 'Được yêu thích',
      text: `${loved.title} · ${loved.rating.toFixed(1)}/5 từ ${formatNumber(loved.ratingCount)} đánh giá`,
      to: `/sach/${loved.id}`,
    })
  }

  list.push({ id: 'trust', tag: 'Cam kết', text: 'Kiểm định 7 bước, hoàn 200% nếu phát hiện sách giả', to: '/ho-tro' })
  list.push({ id: 'buyback', tag: 'Thu mua', text: 'Bán lại sách cũ, báo giá ngay, lấy sách tận nhà', to: '/#thu-mua' })
  return list
}
