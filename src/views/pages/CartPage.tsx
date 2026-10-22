import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CONDITIONS } from '../../data/catalog'
import { useCart } from '../../controllers/useCart'
import { quantityInCart } from '../../models/cart'
import { formatMoney } from '../../models/format'
import type { CartLine } from '../../models/types'
import { Icon } from '../components/Icon'
import { OrderSummary } from '../components/OrderSummary'
import { EmptyState, QtyStepper } from '../components/ui'

export function CartPage() {
  const { items, totals, codes, setQty, applyCoupon, removeCoupon } = useCart()

  useEffect(() => {
    document.title = 'Giỏ hàng — BookWise'
  }, [])

  return (
    <div className="container-page pt-10 sm:pt-14">
      <header className="flex items-end justify-between border-b border-ink pb-6">
        <h1 className="text-4xl sm:text-5xl">Giỏ hàng</h1>
        <p className="text-sm text-ink-mute num">{totals.itemCount} cuốn</p>
      </header>

      {totals.lines.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Giỏ hàng đang trống"
            action={
              <Link to="/sach" className="btn-ink">
                Chọn sách
              </Link>
            }
          >
            Hôm nay có{' '}
            <Link to="/sach?uu-dai=1" className="link">
              vài cuốn đang giảm sâu
            </Link>
            , xem thử nhé.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
          <div>
            <div className="hidden grid-cols-[1fr_8rem_7rem_2rem] gap-4 border-b border-rule pb-3 sm:grid">
              <span className="eyebrow">Sách</span>
              <span className="eyebrow">Số lượng</span>
              <span className="eyebrow text-right">Thành tiền</span>
            </div>
            <ul className="divide-y divide-rule">
              {totals.lines.map((line) => (
                <CartRow
                  key={`${line.bookId}-${line.condition}`}
                  line={line}
                  max={line.book.stock - quantityInCart(items, line.bookId, line.condition)}
                  onQty={(q) => setQty(line.book, line.condition, q)}
                />
              ))}
            </ul>
            <Link to="/sach" className="mt-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
              <Icon name="arrowLeft" size={16} />
              Tiếp tục chọn sách
            </Link>
          </div>

          <aside className="lg:sticky lg:top-32 lg:self-start">
            <OrderSummary totals={totals} codes={codes} onApply={applyCoupon} onRemove={removeCoupon} shippingLabel="Phí giao (tiêu chuẩn)">
              <Link to="/thanh-toan" className="btn-primary w-full">
                Tiến hành thanh toán
                <Icon name="arrowRight" size={16} />
              </Link>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-2xs text-ink-mute">
                <Icon name="lock" size={12} />
                Chọn giao hỏa tốc và phương thức thanh toán ở bước sau
              </p>
            </OrderSummary>
          </aside>
        </div>
      )}
    </div>
  )
}

function CartRow({ line, max, onQty }: { line: CartLine; max: number; onQty: (q: number) => void }) {
  const { book } = line
  return (
    <li className="grid grid-cols-[4.5rem_1fr] gap-4 py-5 sm:grid-cols-[1fr_8rem_7rem_2rem] sm:items-center">
      <div className="contents sm:flex sm:gap-4">
        <Link to={`/sach/${book.id}`} className="row-span-2 sm:row-span-1">
          <img src={book.cover} alt="" className="aspect-[2/3] w-[4.5rem] bg-paper-deep object-cover cover-shadow" />
        </Link>
        <div className="min-w-0">
          <Link to={`/sach/${book.id}`} className="font-display text-lg leading-snug hover:underline underline-offset-4">
            {book.title}
          </Link>
          <p className="text-xs text-ink-mute">{book.author}</p>
          <p className="mt-2 inline-block border border-rule px-1.5 py-0.5 text-2xs text-ink-soft">{CONDITIONS[line.condition].label}</p>
          <p className="mt-1 text-xs text-ink-mute num">{formatMoney(line.unitPrice)} / cuốn</p>
        </div>
      </div>
      <div className="col-start-2 flex items-center justify-between gap-3 sm:contents">
        <QtyStepper size="sm" value={line.qty} max={max} onChange={onQty} />
        <p className="text-right font-semibold num">{formatMoney(line.lineTotal)}</p>
        <button type="button" onClick={() => onQty(0)} className="grid h-8 w-8 place-items-center text-ink-mute hover:text-terra" aria-label={`Xoá ${book.title}`}>
          <Icon name="trash" size={18} />
        </button>
      </div>
    </li>
  )
}
