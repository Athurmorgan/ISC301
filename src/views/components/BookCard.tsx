import { Link } from 'react-router-dom'
import { useCart } from '../../controllers/useCart'
import { isOnDeal, unitPrice } from '../../models/pricing'
import type { Book } from '../../models/types'
import { BookCover } from './BookCover'
import { Icon } from './Icon'
import { Price } from './Price'

interface Props {
  book: Book
  eager?: boolean
}

export function BookCard({ book, eager }: Props) {
  const { add } = useCart()
  const soldOut = book.stock === 0
  const deal = isOnDeal(book)

  return (
    <article className="group flex flex-col">
      <Link to={`/sach/${book.id}`} className="relative block" aria-label={book.title}>
        <BookCover
          src={book.cover}
          title={book.title}
          author={book.author}
          eager={eager}
          className={`transition-transform duration-300 group-hover:-translate-y-1 ${soldOut ? 'opacity-55 grayscale-[40%]' : ''}`}
        />
        {soldOut && <span className="absolute left-2 top-2 bg-paper px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-ink">Tạm hết</span>}
        {deal && !soldOut && <span className="absolute left-2 top-2 bg-terra px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-paper">Giá tốt</span>}
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-xs text-ink-mute line-clamp-1">{book.author}</p>
        <h3 className="mt-1 font-display text-[1.05rem] leading-snug text-ink line-clamp-2">
          <Link to={`/sach/${book.id}`} className="hover:underline decoration-1 underline-offset-4">
            {book.title}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <Price price={unitPrice(book)} listPrice={book.listPrice} size="sm" highlight={deal} />
          <button
            type="button"
            onClick={() => add(book)}
            disabled={soldOut}
            className="grid h-8 w-8 shrink-0 place-items-center border border-rule text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-30"
            aria-label={`Thêm ${book.title} vào giỏ`}
            title="Thêm vào giỏ"
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}
