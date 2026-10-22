import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../controllers/useAuth'
import { useBooks } from '../../controllers/useBooks'
import { useCartCount } from '../../controllers/useCart'
import { suggest } from '../../models/catalogQuery'
import { formatMoney } from '../../models/format'
import { unitPrice } from '../../models/pricing'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { AnnouncementBar } from './AnnouncementBar'

const NAV = [
  { to: '/sach', label: 'Tủ sách' },
  { to: '/sach?uu-dai=1', label: 'Giá tốt hôm nay' },
  { to: '/don-hang', label: 'Tra cứu đơn' },
  { to: '/ho-tro', label: 'Hỗ trợ' },
  { to: '/bao-cao', label: 'Nghiên cứu' },
]

export function Header() {
  const count = useCartCount()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location.pathname, location.search])

  return (
    <header className="sticky top-0 z-40 bg-ink text-paper shadow-[0_6px_18px_-10px_rgb(27_26_23/0.6)]">
      <AnnouncementBar />

      <div className="container-page flex h-16 items-center gap-4 lg:gap-8">
        <button type="button" className="-ml-2 grid h-10 w-10 place-items-center text-paper lg:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Mở menu" aria-expanded={menuOpen}>
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>

        <Link to="/" className="shrink-0" aria-label="BookWise — trang chủ">
          <Logo tone="light" />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Điều hướng chính">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end
              className={({ isActive }) => `relative py-1 text-sm transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-paper after:transition-transform ${
                  isActive && !n.to.includes('?') ? 'text-paper font-semibold after:scale-x-100' : 'text-paper/70 hover:text-paper after:scale-x-0 hover:after:scale-x-100'
                }`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <SearchBox />
          <Link to="/tai-khoan" className="grid h-10 w-10 place-items-center text-paper/85 hover:text-paper" aria-label={user ? `Tài khoản của ${user.name}` : 'Đăng nhập'} title={user ? user.name : 'Đăng nhập'}>
            <Icon name="user" />
          </Link>
          <Link to="/gio-hang" className="relative grid h-10 w-10 place-items-center text-paper/85 hover:text-paper" aria-label={`Giỏ hàng, ${count} cuốn`}>
            <Icon name="bag" />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center bg-terra px-1 text-[10px] font-semibold text-paper num">{count}</span>
            )}
          </Link>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-paper/10 bg-ink lg:hidden animate-fade" aria-label="Menu di động">
          <ul className="container-page divide-y divide-paper/10">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="flex items-center justify-between py-3.5 text-[0.95rem]">
                  {n.label}
                  <Icon name="chevronRight" size={16} className="text-paper/40" />
                </Link>
              </li>
            ))}
            <li>
              <Link to="/tai-khoan" className="flex items-center justify-between py-3.5 text-[0.95rem]">
                {user ? `Tài khoản · ${user.name}` : 'Đăng nhập / Đăng ký'}
                <Icon name="chevronRight" size={16} className="text-paper/40" />
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}

function SearchBox() {
  const books = useBooks()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [active, setActive] = useState(-1)
  const wrap = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const results = useMemo(() => suggest(books, q, 6), [books, q])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) {
        setOpen(false)
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function close() {
    setOpen(false)
    setExpanded(false)
    setQ('')
    setActive(-1)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (active >= 0 && results[active]) navigate(`/sach/${results[active].id}`)
    else navigate(q.trim() ? `/sach?q=${encodeURIComponent(q.trim())}` : '/sach')
    close()
    input.current?.blur()
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        className={`grid h-10 w-10 place-items-center text-paper/85 hover:text-paper md:hidden ${expanded ? 'hidden' : ''}`}
        onClick={() => {
          setExpanded(true)
          requestAnimationFrame(() => input.current?.focus())
        }}
        aria-label="Tìm kiếm"
      >
        <Icon name="search" />
      </button>

      <form
        role="search"
        onSubmit={submit}
        className={`${expanded ? 'fixed inset-x-0 top-8 z-50 flex h-16 items-center bg-ink px-4' : 'hidden'} md:static md:flex md:h-auto md:bg-transparent md:p-0`}
      >
        <label className="relative flex w-full items-center md:w-64 lg:w-72">
          <Icon name="search" size={17} className="pointer-events-none absolute left-3 text-paper/50" />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setOpen(true)
              setActive(-1)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((i) => Math.min(i + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((i) => Math.max(i - 1, -1))
              } else if (e.key === 'Escape') close()
            }}
            placeholder="Tên sách, tác giả…"
            aria-label="Tìm sách"
            className="h-10 w-full border border-paper/15 bg-paper/10 pl-9 pr-3 text-sm text-paper placeholder:text-paper/50 transition-colors focus:border-paper/60 focus:bg-paper/15 focus:outline-none"
          />
        </label>
        {expanded && (
          <button type="button" onClick={close} className="ml-2 px-2 text-sm text-paper/70 md:hidden">
            Huỷ
          </button>
        )}

        {open && q.trim() && (
          <div className="absolute left-0 right-0 top-full z-50 border border-t-0 border-rule bg-card text-ink shadow-[0_12px_24px_-12px_rgb(27_26_23/0.35)] md:top-[calc(100%+4px)] md:border-t md:w-96 md:right-auto">
            {results.length ? (
              <ul role="listbox">
                {results.map((b, i) => (
                  <li key={b.id} role="option" aria-selected={i === active}>
                    <Link to={`/sach/${b.id}`} onClick={close} className={`flex items-center gap-3 px-3 py-2.5 ${i === active ? 'bg-paper-deep' : 'hover:bg-paper'}`}>
                      <img src={b.cover} alt="" className="h-12 w-8 shrink-0 bg-paper-deep object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{b.title}</span>
                        <span className="block truncate text-xs text-ink-mute">{b.author}</span>
                      </span>
                      <span className="text-xs font-semibold num">{formatMoney(unitPrice(b))}</span>
                    </Link>
                  </li>
                ))}
                <li className="border-t border-rule-soft">
                  <button type="submit" className="w-full px-3 py-2.5 text-left text-xs font-semibold text-forest hover:bg-paper">
                    Xem tất cả kết quả cho “{q.trim()}”
                  </button>
                </li>
              </ul>
            ) : (
              <p className="px-3 py-4 text-sm text-ink-soft">Không tìm thấy sách phù hợp với “{q.trim()}”.</p>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
