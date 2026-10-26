import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBook, useBooks, useShelves } from '../../controllers/useBooks'
import { CONDITIONS } from '../../data/catalog'
import { suggest } from '../../models/catalogQuery'
import { formatMoney, formatNumber } from '../../models/format'
import { buybackQuote, unitPrice } from '../../models/pricing'
import type { Book } from '../../models/types'
import { BookCard } from '../components/BookCard'
import { BookCover } from '../components/BookCover'
import { Icon } from '../components/Icon'
import { MoreLink, SectionHeading } from '../components/ui'
import { BuybackModal } from '../components/BuybackModal'

export function HomePage() {
  const { deals, bestsellers, staffPicks, categoryCounts } = useShelves()

  return (
    <>
      <Hero />
      <Promises />

      <section className="container-page mt-20">
        <SectionHeading
          index="01"
          kicker="Siêu rẻ"
          title="Dưới 40% giá bìa"
          action={<MoreLink to="/sach?uu-dai=1">Xem tất cả</MoreLink>}
        />
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {deals.slice(0, 6).map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      </section>

      <section className="container-page mt-24">
        <SectionHeading index="02" kicker="Tủ sách" title="Bốn kệ, một tiêu chuẩn kiểm định" action={<MoreLink to="/sach">Xem toàn bộ tủ sách</MoreLink>} />
        <ul className="grid border-l border-t border-rule sm:grid-cols-2 lg:grid-cols-4">
          {categoryCounts.map((c, i) => (
            <li key={c.id} className="border-b border-r border-rule">
              <Link to={`/sach?the-loai=${c.id}`} className="group flex h-full flex-col justify-between gap-10 p-6 transition-colors hover:bg-card">
                <span className="font-mono text-xs text-ink-mute">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="block font-display text-2xl leading-tight">{c.name}</span>
                  <span className="mt-1 block text-sm text-ink-soft">{c.blurb}</span>
                  <span className="mt-5 flex items-center justify-between text-xs text-ink-mute">
                    <span className="num">{c.count} đầu sách</span>
                    <Icon name="arrowRight" size={16} className="text-ink transition-transform group-hover:translate-x-1" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page mt-24 grid gap-14 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <SectionHeading index="03" kicker="Bán chạy" title="Mười cuốn được mua nhiều nhất" />
          <ol className="divide-y divide-rule-soft border-b border-rule-soft">
            {bestsellers.map((b, i) => (
              <BestsellerRow key={b.id} book={b} rank={i + 1} />
            ))}
          </ol>
        </div>
        <StaffPicks books={staffPicks} />
      </section>

      <BuybackEstimator />
    </>
  )
}

function Hero() {
  const books = useBooks()
  const hero = ['nha-gia-kim', 'tam-ly-hoc-ve-tien', 'sapiens']
    .map((id) => books.find((b) => b.id === id))
    .filter((b): b is Book => !!b)
  const totalBooks = books.reduce((s, b) => s + b.stock, 0)

  return (
    <section className="border-b border-rule">
      <div className="container-page grid items-center gap-12 py-14 md:grid-cols-[1.1fr_1fr] md:py-20 lg:gap-20">
        <div>
          <p className="eyebrow">Sách cũ giá sinh viên · Đã kiểm định</p>
          <h1 className="mt-5 text-[2.6rem] font-medium leading-[1.04] tracking-[-0.02em] xs:text-5xl lg:text-[4.25rem]">
            Mỗi cuốn sách
            <br />
            xứng đáng có <em className="font-normal italic text-forest">thêm một</em>
            <br />
            người đọc.
          </h1>
          <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-ink-soft">
            Giáo trình và sách đã đọc, giá chỉ từ 40% giá bìa. Sinh viên được duyệt hồ sơ có thể tự đăng bán sách mình không dùng nữa.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/sach" className="btn-primary">
              Vào tủ sách
              <Icon name="arrowRight" size={16} />
            </Link>
            <Link to="/tai-khoan?tab=seller" className="btn-ghost">
              Đăng ký bán sách
            </Link>
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-rule pt-5">
            {[
              [formatNumber(books.length), 'đầu sách'],
              [formatNumber(totalBooks), 'cuốn đang bán'],
              ['4,7', 'điểm đánh giá'],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-2xl num">{v}</dd>
                <dd className="text-xs text-ink-mute">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto grid w-full max-w-md grid-cols-[1fr_1.25fr_1fr] items-end gap-3 md:max-w-none">
          {hero.map((b, i) => (
            <Link key={b.id} to={`/sach/${b.id}`} className={`block transition-transform hover:-translate-y-1.5 ${i === 1 ? '' : 'mb-8'}`}>
              <BookCover src={b.cover} title={b.title} eager />
            </Link>
          ))}
          <div className="col-span-3 mt-2 h-px bg-ink" />
          <p className="col-span-3 flex justify-between text-2xs text-ink-mute">
            <span>Trên kệ tuần này</span>
            <span className="font-mono">Nº {String(new Date().getDate()).padStart(2, '0')}/{String(new Date().getMonth() + 1).padStart(2, '0')}</span>
          </p>
        </div>
      </div>
    </section>
  )
}

const PROMISES = [
  { icon: 'shield', title: 'Kiểm định 7 bước', body: 'Đối chiếu ISBN, giấy, bản in và tem nhà phát hành. Phát hiện sách giả, hoàn 200%.' },
  { icon: 'tag', title: 'Sinh viên bán cho sinh viên', body: 'Đăng ký người bán bằng CCCD, được duyệt là đăng tin. BookWise kiểm sách và giao giúp bạn.' },
  { icon: 'refresh', title: 'Thu mua sách cũ', body: 'Báo giá tức thì, lấy tận nhà, chuyển khoản trong 24 giờ sau kiểm định.' },
] as const

function Promises() {
  return (
    <section className="border-b border-rule bg-card">
      <ul className="container-page grid divide-y divide-rule md:grid-cols-3 md:divide-x md:divide-y-0">
        {PROMISES.map((p) => (
          <li key={p.title} className="flex gap-4 py-6 md:px-6 md:first:pl-0 md:last:pr-0">
            <Icon name={p.icon} size={22} className="mt-0.5 shrink-0 text-forest" />
            <div>
              <p className="font-semibold">{p.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function BestsellerRow({ book, rank }: { book: Book; rank: number }) {
  return (
    <li>
      <Link to={`/sach/${book.id}`} className="group grid grid-cols-[2.25rem_2.75rem_1fr_auto] items-center gap-4 py-3">
        <span className="font-display text-2xl text-ink-mute num group-hover:text-forest">{rank}</span>
        <img src={book.cover} alt="" loading="lazy" className="aspect-[2/3] w-full bg-paper-deep object-cover" />
        <span className="min-w-0">
          <span className="block truncate font-medium group-hover:underline underline-offset-4">{book.title}</span>
          <span className="block truncate text-xs text-ink-mute">
            {book.author} · {formatNumber(book.sold)} đã bán
          </span>
        </span>
        <span className="text-sm font-semibold num">{formatMoney(unitPrice(book))}</span>
      </Link>
    </li>
  )
}

function StaffPicks({ books }: { books: Book[] }) {
  const [index, setIndex] = useState(0)
  const book = books[index]
  if (!book) return null
  const go = (d: number) => setIndex((i) => (i + d + books.length) % books.length)

  return (
    <div>
      <SectionHeading index="04" kicker="Nhân viên chọn" title="Sách chúng tôi đọc và muốn bạn đọc" />
      <article className="grid gap-8 bg-forest p-6 text-paper sm:grid-cols-[10rem_1fr] sm:p-10">
        <Link to={`/sach/${book.id}`} className="mx-auto w-36 sm:w-full">
          <BookCover src={book.cover} title={book.title} />
        </Link>
        <div className="flex flex-col">
          <p className="font-mono text-xs text-paper/60 num">
            {String(index + 1).padStart(2, '0')} / {String(books.length).padStart(2, '0')}
          </p>
          <blockquote className="mt-4 font-display text-[1.45rem] italic leading-snug">“{book.staffPick}”</blockquote>
          <p className="mt-5 text-sm text-paper/75">
            <Link to={`/sach/${book.id}`} className="font-semibold text-paper underline decoration-paper/40 underline-offset-4 hover:decoration-paper">
              {book.title}
            </Link>{' '}
            — {book.author}
          </p>
          <div className="mt-auto flex items-center justify-between pt-8">
            <p className="num">
              <span className="text-lg font-semibold">{formatMoney(unitPrice(book))}</span>
              <s className="ml-2 text-xs text-paper/50">{formatMoney(book.listPrice)}</s>
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => go(-1)} className="grid h-10 w-10 place-items-center border border-paper/30 hover:border-paper" aria-label="Cuốn trước">
                <Icon name="arrowLeft" size={18} />
              </button>
              <button type="button" onClick={() => go(1)} className="grid h-10 w-10 place-items-center border border-paper/30 hover:border-paper" aria-label="Cuốn sau">
                <Icon name="arrowRight" size={18} />
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}

function BuybackEstimator() {
  const books = useBooks()
  const [q, setQ] = useState('')
  const [pickedId, setPickedId] = useState<string>()
  const [showModal, setShowModal] = useState(false)
  const picked = useBook(pickedId)
  const matches = useMemo(() => (picked ? [] : suggest(books, q, 5)), [books, q, picked])

  return (
    <section id="thu-mua" className="mt-24 scroll-mt-28 border-y border-ink bg-paper-deep">
      <div className="container-page grid gap-10 py-16 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <p className="eyebrow">
            <span className="mr-3 font-mono text-ink">05</span>Bán lại sách cũ
          </p>
          <h2 className="mt-3 text-[2rem] leading-tight sm:text-[2.6rem]">Sách đã đọc xong, đừng để chúng đóng bụi.</h2>
          <p className="mt-5 max-w-md leading-relaxed text-ink-soft">
            Tìm cuốn sách bạn muốn bán để xem giá thu mua ước tính. BookWise đến lấy tận nhà và chuyển khoản trong 24 giờ sau khi kiểm định.
          </p>
          <ol className="mt-8 space-y-3 text-sm">
            {['Tra giá thu mua theo tình trạng', 'Gửi yêu cầu, hẹn giờ lấy sách', 'Nhận tiền sau khi kiểm định'].map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="font-mono text-ink-mute">{i + 1}.</span>
                {s}
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-card p-6 sm:p-8">
          <label htmlFor="buyback-q" className="label">
            Tên sách bạn muốn bán
          </label>
          <div className="relative">
            <input
              id="buyback-q"
              className="field"
              value={picked ? picked.title : q}
              onChange={(e) => {
                setPickedId(undefined)
                setQ(e.target.value)
              }}
              placeholder="Ví dụ: Nhà giả kim"
              autoComplete="off"
            />
            {matches.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-10 border border-t-0 border-rule bg-card">
                {matches.map((b) => (
                  <li key={b.id}>
                    <button type="button" onClick={() => setPickedId(b.id)} className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-paper">
                      <span className="truncate">{b.title}</span>
                      <span className="shrink-0 text-xs text-ink-mute">{b.author}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {picked ? (
            <div className="mt-6 grid grid-cols-[4.5rem_1fr] gap-5 animate-fade">
              <BookCover src={picked.cover} title={picked.title} />
              <div>
                <p className="font-display text-lg leading-snug">{picked.title}</p>
                <p className="text-xs text-ink-mute">Giá bìa {formatMoney(picked.listPrice)}</p>
                <dl className="mt-4 divide-y divide-rule-soft border-y border-rule-soft text-sm">
                  {(['likenew', 'used'] as const).map((c) => (
                    <div key={c} className="flex items-center justify-between py-2.5">
                      <dt className="text-ink-soft">{CONDITIONS[c].label}</dt>
                      <dd className="font-semibold text-forest num">{formatMoney(buybackQuote(picked, c))}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <button type="button" onClick={() => setShowModal(true)} className="btn-ink col-span-2">
                Gửi yêu cầu thu mua
                <Icon name="arrowRight" size={16} />
              </button>
            </div>
          ) : (
            <div className="mt-6 border border-dashed border-rule px-4 py-8 text-center text-sm text-ink-mute">
              <p>Giá thu mua: 30% giá bìa với sách như mới, 20% với sách đã qua sử dụng.</p>
              <button type="button" onClick={() => setShowModal(true)} className="btn-ghost btn-sm mt-4">
                Bán sách không có trong danh mục
              </button>
            </div>
          )}
        </div>
      </div>
      {showModal && <BuybackModal book={picked} onClose={() => setShowModal(false)} />}
    </section>
  )
}
