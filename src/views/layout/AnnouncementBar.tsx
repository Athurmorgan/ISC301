import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useBooks } from '../../controllers/useBooks'
import { useAllOrders } from '../../controllers/useOrders'
import { buildAnnouncements, type Announcement } from '../../models/announcements'

/** Dải chữ chạy đầu trang; dừng khi rê chuột, đứng yên nếu người dùng tắt hiệu ứng chuyển động */
export function AnnouncementBar() {
  const books = useBooks()
  const orders = useAllOrders()
  const items = useMemo(() => buildAnnouncements(books, orders), [books, orders])
  if (!items.length) return null

  return (
    <div className="marquee group relative h-8 overflow-hidden bg-forest text-paper" aria-label="Thông báo và ưu đãi">
      <div className="marquee-track flex h-full w-max items-center group-hover:[animation-play-state:paused]" style={{ animationDuration: `${items.length * 6}s` }}>
        <Row items={items} />
        <Row items={items} hidden />
      </div>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-forest" />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-forest" />
    </div>
  )
}

/** Hai bản sao nối đuôi nhau để vòng chạy liền mạch; bản thứ hai ẩn với trình đọc màn hình */
function Row({ items, hidden }: { items: Announcement[]; hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((a) => (
        <li key={a.id} className="flex items-center">
          <Item a={a} tabIndex={hidden ? -1 : undefined} />
          <span className="mx-6 h-1 w-1 rotate-45 bg-paper/40" />
        </li>
      ))}
    </ul>
  )
}

function Item({ a, tabIndex }: { a: Announcement; tabIndex?: number }) {
  const body = (
    <>
      <span className="mr-2.5 border border-paper/35 px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.12em] text-paper/85">{a.tag}</span>
      <span className="whitespace-nowrap text-2xs tracking-wide">{a.text}</span>
    </>
  )
  return a.to ? (
    <Link to={a.to} tabIndex={tabIndex} className="flex items-center hover:underline underline-offset-4 decoration-paper/50">
      {body}
    </Link>
  ) : (
    <span className="flex items-center">{body}</span>
  )
}
