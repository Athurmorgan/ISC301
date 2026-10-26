import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CONDITION_ORDER, CONDITIONS, categoryName } from '../../data/catalog'
import { useAuth } from '../../controllers/useAuth'
import { useBook, useBooks, useOffers } from '../../controllers/useBooks'
import { useCart } from '../../controllers/useCart'
import { useReviews } from '../../controllers/useFeedback'
import { useWishlist } from '../../controllers/useWishlist'
import { quantityInCart } from '../../models/cart'
import { related } from '../../models/catalogQuery'
import { formatDate, formatMoney, formatNumber } from '../../models/format'
import { savingPercent, unitPrice } from '../../models/pricing'
import { BOOKWISE_SELLER, type Book, type ConditionId } from '../../models/types'
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
  const { items, addListing } = useCart()
  const { user } = useAuth()
  const { isFavorite, toggle: toggleFav } = useWishlist()
  const offers = useOffers(book.id)
  const navigate = useNavigate()
  const [filter, setFilter] = useState<ConditionId | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string>()
  const [qty, setQty] = useState(1)

  const me = user?.email
  const shown = filter === 'all' ? offers : offers.filter((o) => o.condition === filter)
  // Mặc định chọn tin rẻ nhất không phải của chính mình
  const selected = shown.find((o) => o.id === selectedId) ?? shown.find((o) => o.sellerId !== me) ?? shown[0]
  const fav = isFavorite(book.id)
  const available = selected && selected.sellerId !== me ? Math.max(0, selected.qty - quantityInCart(items, selected.id)) : 0
  const relatedBooks = useMemo(() => related(books, book, 4), [books, book])

  function addToCart(goToCheckout: boolean) {
    if (selected && addListing(selected, qty, goToCheckout)) {
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
              <Icon name="tag" size={18} className="mx-auto mb-1 text-forest" />
              Giá sinh viên
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
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs text-ink-mute">{offers.length ? 'Giá rẻ nhất hiện có' : 'Giá tham khảo'}</p>
                <div className="mt-1">
                  <Price price={book.price} listPrice={book.listPrice} size="lg" highlight={offers.length > 0} />
                </div>
              </div>
              <p className="text-xs text-ink-mute">
                {offers.length ? `${offers.length} tin đăng · ${book.stock} cuốn` : 'Chưa có ai đăng bán'}
              </p>
            </div>

            {offers.length > 0 && (
              <fieldset className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <legend className="label mb-0">Chọn người bán</legend>
                  <div className="flex gap-1.5" role="group" aria-label="Lọc theo tình trạng">
                    {(['all', ...CONDITION_ORDER] as const).map((c) => {
                      const count = c === 'all' ? offers.length : offers.filter((o) => o.condition === c).length
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFilter(c)}
                          disabled={!count}
                          className={`h-7 border px-2.5 text-2xs disabled:opacity-40 ${filter === c ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-soft hover:border-ink'}`}
                        >
                          {c === 'all' ? 'Tất cả' : CONDITIONS[c].label.split(' · ')[0]} ({count})
                        </button>
                      )
                    })}
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {shown.map((o) => {
                    const active = o.id === selected?.id
                    return (
                      <li key={o.id}>
                        <label
                          className={`flex cursor-pointer items-start gap-3 border px-3.5 py-3 transition-colors ${active ? 'border-ink bg-card shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-rule hover:border-ink-mute'}`}
                        >
                          <input type="radio" name="offer" value={o.id} checked={active} onChange={() => setSelectedId(o.id)} className="sr-only" />
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                              {CONDITIONS[o.condition].label}
                              <span className={`px-1.5 py-0.5 text-2xs font-medium ${o.sellerId === BOOKWISE_SELLER ? 'bg-forest-tint text-forest' : 'bg-paper-deep text-ink-soft'}`}>
                                {o.sellerId === BOOKWISE_SELLER ? 'Kho BookWise' : `Người bán: ${o.sellerName}`}
                              </span>
                            </p>
                            {o.note && <p className="mt-1 text-xs text-ink-soft">{o.note}</p>}
                            <p className="mt-1 text-2xs text-ink-mute">Còn {o.qty} cuốn{o.sellerId === me ? ' · Tin của bạn' : ''}</p>
                          </div>
                          <span className="shrink-0 text-right">
                            <span className="block font-semibold num">{formatMoney(o.price)}</span>
                            <span className="text-2xs text-terra num">−{savingPercent(o.price, book.listPrice)}%</span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-2.5 text-xs text-ink-mute">
                  Mọi cuốn đều gửi về BookWise kiểm định trước khi giao. Sai mô tả được đổi trả trong 7 ngày.
                </p>
              </fieldset>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {selected && available > 0 ? (
                <>
                  <QtyStepper value={Math.min(qty, available)} max={available} onChange={setQty} />
                  <button type="button" onClick={() => addToCart(false)} className="btn-ink flex-1 sm:flex-none">
                    Thêm vào giỏ
                  </button>
                  <button type="button" onClick={() => addToCart(true)} className="btn-primary flex-1 sm:flex-none">
                    Mua ngay
                  </button>
                  <FavButton fav={fav} onClick={() => toggleFav(book)} />
                </>
              ) : (
                <div className="flex w-full items-center gap-3">
                  <p className="flex-1 border border-rule bg-card px-4 py-3 text-sm text-ink-soft">
                    {!offers.length
                      ? 'Sách tạm hết. Lưu yêu thích để được báo khi có người đăng bán.'
                      : selected?.sellerId === me
                        ? 'Đây là tin bạn đang đăng bán.'
                        : 'Bạn đã cho toàn bộ số sách của tin này vào giỏ.'}
                  </p>
                  <FavButton fav={fav} onClick={() => toggleFav(book)} />
                </div>
              )}
            </div>
            <p className="mt-4 text-xs text-ink-soft">
              Có cuốn này và không dùng nữa?{' '}
              <Link to={`/tai-khoan?tab=seller&sach=${book.id}`} className="font-medium text-ink underline underline-offset-4">
                Đăng bán cho bạn khác
              </Link>
            </p>
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

function FavButton({ fav, onClick }: { fav: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid h-11 w-11 shrink-0 place-items-center border border-rule transition-colors hover:border-ink ${fav ? 'bg-card text-terra border-terra' : 'bg-card text-ink'}`}
      aria-label={fav ? 'Bỏ yêu thích' : 'Lưu vào yêu thích'}
      title={fav ? 'Bỏ yêu thích' : 'Lưu vào yêu thích'}
    >
      <Icon name="heart" size={18} filled={fav} />
    </button>
  )
}

/** Gợi ý mua kèm cuốn cùng kệ bán chạy nhất (ưu tiên cùng tác giả) */
function Bundle({ book, partner }: { book: Book; partner: Book }) {
  const { add } = useCart()
  const total = unitPrice(book) + unitPrice(partner)

  const addBoth = () => add(book, 1, true) && add(partner)

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
          <p className="text-xs text-ink-mute">Tổng hai cuốn (giá rẻ nhất)</p>
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
  const { reviews, add, hasPurchased } = useReviews(book.id)
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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{r.name}</p>
                      {r.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 bg-forest-tint px-2 py-0.5 text-2xs font-semibold text-forest">
                          <Icon name="check" size={11} /> Đã mua hàng
                        </span>
                      )}
                    </div>
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
          {hasPurchased && (
            <div className="flex items-center gap-2 border border-forest/30 bg-forest-tint p-2.5 text-xs text-forest">
              <Icon name="check" size={14} className="shrink-0" />
              <span>Bạn đã mua cuốn sách này. Nhận xét của bạn sẽ được đánh dấu <strong>Đã mua hàng</strong>.</span>
            </div>
          )}
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
