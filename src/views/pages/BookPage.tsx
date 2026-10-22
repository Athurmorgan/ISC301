import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CONDITION_ORDER, CONDITIONS, categoryName } from '../../data/catalog'
import { useAuth } from '../../controllers/useAuth'
import { useBook, useBooks } from '../../controllers/useBooks'
import { useCart } from '../../controllers/useCart'
import { useReviews } from '../../controllers/useFeedback'
import { quantityInCart } from '../../models/cart'
import { related } from '../../models/catalogQuery'
import { formatDate, formatMoney, formatNumber } from '../../models/format'
import { unitPrice } from '../../models/pricing'
import type { Book, ConditionId } from '../../models/types'
import { BookCard } from '../components/BookCard'
import { BookCover } from '../components/BookCover'
import { Icon } from '../components/Icon'
import { Price } from '../components/Price'
import { Rating, StarInput } from '../components/Rating'
import { EmptyState, QtyStepper, SectionHeading, TextArea, TextField } from '../components/ui'
import { NotFoundPage } from './NotFoundPage'

export function BookPage() {
  const { id } = useParams()
  const book = useBook(id)

  useEffect(() => {
    if (book) document.title = `${book.title} — ${book.author} | BookWise`
  }, [book])

  if (!book) return <NotFoundPage />
  // key: đổi sách thì đặt lại toàn bộ lựa chọn
  return <BookDetail key={book.id} book={book} />
}

function BookDetail({ book }: { book: Book }) {
  const books = useBooks()
  const { items, add } = useCart()
  const navigate = useNavigate()
  const [condition, setCondition] = useState<ConditionId>('seal')
  const [qty, setQty] = useState(1)

  const available = Math.max(0, book.stock - quantityInCart(items, book.id))
  const price = unitPrice(book, condition)
  const relatedBooks = useMemo(() => related(books, book, 4), [books, book])

  function addToCart(goToCheckout: boolean) {
    if (add(book, condition, qty, goToCheckout)) {
      setQty(1)
      if (goToCheckout) navigate('/thanh-toan')
    }
  }

  return (
    <>
      <div className="container-page pt-6">
        <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-1.5 text-xs text-ink-mute">
          <Link to="/" className="hover:text-ink">Trang chủ</Link>
          <Icon name="chevronRight" size={12} />
          <Link to={`/sach?the-loai=${book.category}`} className="hover:text-ink">{categoryName(book.category)}</Link>
          <Icon name="chevronRight" size={12} />
          <span className="text-ink-soft line-clamp-1">{book.title}</span>
        </nav>
      </div>

      <section className="container-page mt-8 grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="md:sticky md:top-32 md:self-start">
          <div className="mx-auto max-w-[22rem] bg-paper-deep px-10 py-12 sm:px-14">
            <BookCover src={book.cover} title={book.title} author={book.author} eager />
          </div>
          <ul className="mx-auto mt-4 grid max-w-[22rem] grid-cols-3 border-y border-rule text-center text-2xs text-ink-soft">
            <li className="py-3">
              <Icon name="shield" size={18} className="mx-auto mb-1 text-forest" />
              Kiểm định 7 bước
            </li>
            <li className="border-x border-rule py-3">
              <Icon name="truck" size={18} className="mx-auto mb-1 text-forest" />
              Hỏa tốc 2 giờ
            </li>
            <li className="py-3">
              <Icon name="refresh" size={18} className="mx-auto mb-1 text-forest" />
              Đổi trả 7 ngày
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">{categoryName(book.category)}</p>
          <h1 className="mt-3 text-[2.2rem] font-medium leading-[1.08] sm:text-5xl">{book.title}</h1>
          <p className="mt-3 text-ink-soft">
            {book.author}
            {book.originalTitle && book.originalTitle !== book.title && (
              <span className="text-ink-mute"> · <i className="font-display">{book.originalTitle}</i></span>
            )}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Rating value={book.rating} count={book.ratingCount} />
            <span className="text-xs text-ink-mute num">{formatNumber(book.sold)} đã bán</span>
          </div>

          <div className="mt-8 border-y border-rule py-6">
            <Price price={price} listPrice={book.listPrice} size="lg" highlight={condition === 'seal' && !!book.dealPrice} />
            {condition === 'seal' && book.dealPrice && (
              <p className="mt-2 text-xs text-terra">Giá tốt chỉ áp dụng trong hôm nay cho bản mới nguyên seal.</p>
            )}

            <fieldset className="mt-6">
              <legend className="label">Tình trạng sách</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {CONDITION_ORDER.map((c) => {
                  const active = c === condition
                  return (
                    <label
                      key={c}
                      className={`cursor-pointer border px-3.5 py-3 transition-colors ${active ? 'border-ink bg-card shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-rule hover:border-ink-mute'}`}
                    >
                      <input type="radio" name="condition" value={c} checked={active} onChange={() => setCondition(c)} className="sr-only" />
                      <span className="block text-sm font-semibold">{CONDITIONS[c].label}</span>
                      <span className="mt-0.5 block text-sm num">{formatMoney(unitPrice(book, c))}</span>
                    </label>
                  )
                })}
              </div>
              <p className="mt-2.5 text-xs text-ink-mute">{CONDITIONS[condition].note}</p>
            </fieldset>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {available > 0 ? (
                <>
                  <QtyStepper value={Math.min(qty, available)} max={available} onChange={setQty} />
                  <button type="button" onClick={() => addToCart(false)} className="btn-ink flex-1 sm:flex-none">
                    Thêm vào giỏ
                  </button>
                  <button type="button" onClick={() => addToCart(true)} className="btn-primary flex-1 sm:flex-none">
                    Mua ngay
                  </button>
                </>
              ) : (
                <p className="w-full border border-rule bg-card px-4 py-3 text-sm text-ink-soft">
                  {book.stock === 0 ? 'Sách tạm hết hàng. Chúng tôi sẽ nhập thêm trong 1–2 tuần.' : 'Bạn đã cho toàn bộ số sách còn lại vào giỏ.'}
                </p>
              )}
            </div>
            {book.stock > 0 && book.stock <= 10 && <p className="mt-3 text-xs font-semibold text-terra">Chỉ còn {book.stock} cuốn trong kho</p>}
          </div>

          <div className="mt-8">
            <h2 className="eyebrow">Giới thiệu</h2>
            <p className="mt-3 text-[1.02rem] leading-[1.75] text-ink-soft">{book.description}</p>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 border-t border-rule text-sm sm:grid-cols-3">
            {[
              ['Tác giả', book.author],
              ['Nguyên tác', book.originalLanguage || '—'],
              ['Xuất bản lần đầu', String(book.firstPublished)],
              ['Số trang', book.pages ? formatNumber(book.pages) : '—'],
              ['Đơn vị phát hành', book.publisher ?? 'Đang cập nhật'],
              ['Mã sách', book.id],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-rule-soft py-3">
                <dt className="text-xs text-ink-mute">{k}</dt>
                <dd className="mt-0.5 truncate font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          {relatedBooks[0] && <Bundle book={book} partner={relatedBooks[0]} />}
        </div>
      </section>

      <Reviews book={book} />

      {relatedBooks.length > 0 && (
        <section className="container-page mt-24">
          <SectionHeading kicker="Cùng kệ" title="Có thể bạn cũng thích" />
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4">
            {relatedBooks.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

/** Gợi ý mua kèm cuốn cùng kệ bán chạy nhất (ưu tiên cùng tác giả) */
function Bundle({ book, partner }: { book: Book; partner: Book }) {
  const { add } = useCart()
  const total = unitPrice(book) + unitPrice(partner)

  const addBoth = () => add(book, 'seal', 1, true) && add(partner, 'seal', 1)

  return (
    <div className="mt-10 border border-rule bg-card p-5">
      <p className="eyebrow">Thường được mua cùng</p>
      <div className="mt-4 flex items-center gap-4">
        <img src={book.cover} alt="" className="h-20 w-[3.33rem] bg-paper-deep object-cover cover-shadow" />
        <Icon name="plus" size={16} className="shrink-0 text-ink-mute" />
        <Link to={`/sach/${partner.id}`}>
          <img src={partner.cover} alt="" className="h-20 w-[3.33rem] bg-paper-deep object-cover cover-shadow" />
        </Link>
        <div className="min-w-0 flex-1 pl-2">
          <Link to={`/sach/${partner.id}`} className="block truncate text-sm font-medium hover:underline">
            {partner.title}
          </Link>
          <p className="text-xs text-ink-mute">Tổng hai cuốn (bản mới)</p>
          <p className="mt-1 font-semibold num">{formatMoney(total)}</p>
        </div>
      </div>
      <button type="button" onClick={addBoth} disabled={!book.stock || !partner.stock} className="btn-outline btn-sm mt-4 w-full">
        Thêm cả hai vào giỏ
      </button>
    </div>
  )
}

function Reviews({ book }: { book: Book }) {
  const { reviews, add } = useReviews(book.id)
  const { user } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = add({ name, rating, body })
    if (!r.ok) return setError(r.error)
    setError('')
    setBody('')
    setRating(0)
    setSent(true)
  }

  return (
    <section className="container-page mt-24" id="danh-gia">
      <SectionHeading kicker="Đánh giá" title="Người đọc nói gì" />
      <div className="grid gap-12 lg:grid-cols-[18rem_1fr_22rem]">
        <div>
          <p className="font-display text-6xl num">{book.rating ? book.rating.toFixed(1) : '—'}</p>
          <div className="mt-2">
            <Rating value={book.rating} size={16} />
          </div>
          <p className="mt-2 text-sm text-ink-mute">
            Từ {formatNumber(book.ratingCount + reviews.length)} lượt đánh giá trên BookWise và các nền tảng đối tác.
          </p>
        </div>

        <div>
          {reviews.length ? (
            <ul className="divide-y divide-rule-soft border-y border-rule-soft">
              {[...reviews].reverse().map((r) => (
                <li key={r.at} className="py-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-xs text-ink-mute">{formatDate(r.at)}</p>
                  </div>
                  <div className="mt-1">
                    <Rating value={r.rating} />
                  </div>
                  <p className="mt-3 leading-relaxed text-ink-soft">{r.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Chưa có nhận xét chi tiết">Hãy là người đầu tiên kể về trải nghiệm đọc cuốn sách này.</EmptyState>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4 border border-rule bg-card p-5" noValidate>
          <p className="font-display text-xl">Viết nhận xét</p>
          {sent && <p className="bg-forest-tint px-3 py-2 text-sm text-forest">Cảm ơn bạn! Nhận xét đã được đăng.</p>}
          <div>
            <span className="label">Bạn chấm mấy sao?</span>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <TextField label="Tên hiển thị" value={name} onChange={(e) => setName(e.target.value)} />
          <TextArea label="Nhận xét" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Điều bạn thích hoặc chưa thích ở cuốn sách này" />
          {error && <p className="text-sm text-terra">{error}</p>}
          <button type="submit" className="btn-ink w-full">
            Gửi nhận xét
          </button>
        </form>
      </div>
    </section>
  )
}
