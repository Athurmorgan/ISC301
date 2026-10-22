import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, STATUS_LABEL, TICKET_TOPICS, categoryName } from '../../data/catalog'
import { emptyBookForm, toForm, useAdminBooks, validateBookForm, type BookForm, type BookFormErrors } from '../../controllers/useAdminBooks'
import { useAuth } from '../../controllers/useAuth'
import { useBooks } from '../../controllers/useBooks'
import { useTickets } from '../../controllers/useFeedback'
import { useAllOrders, useOrderActions } from '../../controllers/useOrders'
import { formatDate, formatDateTime, formatMoney, formatNumber, normalize } from '../../models/format'
import { NEXT_ACTION_LABEL, adminCanCancel, itemCount } from '../../models/order'
import { unitPrice } from '../../models/pricing'
import type { CategoryId, OrderStatus } from '../../models/types'
import { hasErrors } from '../../models/validation'
import { Icon } from '../components/Icon'
import { LivePanel } from '../components/LivePanel'
import { ConfirmButton, EmptyState, Modal, SelectField, StatusTag, TextArea, TextField } from '../components/ui'

type Tab = 'live' | 'orders' | 'books' | 'tickets'

export function AdminPage() {
  const { user, isAdmin, logout } = useAuth()
  const orders = useAllOrders()
  const books = useBooks()
  const { tickets } = useTickets()
  const [tab, setTab] = useState<Tab>('live')

  useEffect(() => {
    document.title = 'Quản trị — BookWise'
  }, [])

  if (!isAdmin) {
    return (
      <div className="container-page max-w-xl pt-16">
        <EmptyState title="Khu vực dành cho quản trị viên" action={<Link to="/tai-khoan" className="btn-ink">Đăng nhập</Link>}>
          {user ? 'Tài khoản của bạn không có quyền truy cập trang này.' : 'Đăng nhập bằng admin@bookwise.vn / admin123 để quản lý đơn hàng và kho sách.'}
        </EmptyState>
      </div>
    )
  }

  const live = orders.filter((o) => o.status !== 'cancelled')
  const stats = [
    { label: 'Doanh thu', value: formatMoney(live.reduce((s, o) => s + o.total, 0)), note: `${live.length} đơn hợp lệ` },
    { label: 'Chờ xác nhận', value: formatNumber(orders.filter((o) => o.status === 'pending').length), note: 'đơn cần xử lý' },
    { label: 'Sắp hết hàng', value: formatNumber(books.filter((b) => b.stock <= 5).length), note: 'đầu sách ≤ 5 cuốn' },
    { label: 'Yêu cầu mở', value: formatNumber(tickets.filter((t) => t.status === 'open').length), note: 'phiếu hỗ trợ' },
  ]
  const TABS: Record<Tab, string> = {
    live: 'Trực tiếp',
    orders: `Đơn hàng (${orders.length})`,
    books: `Kho sách (${books.length})`,
    tickets: `Hỗ trợ (${tickets.length})`,
  }

  return (
    <div className="container-page pt-10 sm:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-6">
        <div>
          <p className="eyebrow">Quản trị</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Bàn làm việc</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/bao-cao" className="btn-ghost btn-sm">Báo cáo doanh số</Link>
          <button type="button" onClick={logout} className="btn-ghost btn-sm">Đăng xuất</button>
        </div>
      </header>

      <dl className="grid grid-cols-2 border-b border-rule lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`py-6 ${i % 2 ? 'pl-5' : 'pr-5'} lg:px-6 lg:first:pl-0 ${i > 0 ? 'lg:border-l lg:border-rule' : ''} ${i % 2 ? 'border-l border-rule' : ''}`}>
            <dt className="eyebrow">{s.label}</dt>
            <dd className="mt-2 font-display text-[1.65rem] leading-none num sm:text-3xl">{s.value}</dd>
            <dd className="mt-1.5 text-xs text-ink-mute">{s.note}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex gap-6 border-b border-rule" role="tablist">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-3 text-sm ${tab === t ? 'border-ink font-semibold text-ink' : 'border-transparent text-ink-mute hover:text-ink'}`}
          >
            {TABS[t]}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'live' && <LivePanel />}
        {tab === 'orders' && <OrdersPanel />}
        {tab === 'books' && <BooksPanel />}
        {tab === 'tickets' && <TicketsPanel />}
      </div>
    </div>
  )
}

function OrdersPanel() {
  const orders = useAllOrders()
  const { advance, cancelByAdmin } = useOrderActions()
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [armed, setArmed] = useState<string>()
  const sorted = useMemo(() => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [orders])
  const shown = filter === 'all' ? sorted : sorted.filter((o) => o.status === filter)

  if (!orders.length) {
    return (
      <EmptyState title="Chưa có đơn hàng" action={<Link to="/sach" className="btn-ghost">Đặt thử một đơn</Link>}>
        Đặt một đơn ở giao diện khách, đơn sẽ xuất hiện ở đây để xác nhận và cập nhật trạng thái giao.
      </EmptyState>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'pending', 'confirmed', 'shipping', 'delivered', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`h-8 border px-3 text-xs ${filter === s ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-soft hover:border-ink'}`}
          >
            {s === 'all' ? 'Tất cả' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-ink text-left">
              {['Mã đơn', 'Khách hàng', 'Sách', 'Tổng tiền', 'Thanh toán', 'Trạng thái', ''].map((h) => (
                <th key={h} className="eyebrow py-3 pr-4 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule-soft">
            {shown.map((o) => {
              const next = NEXT_ACTION_LABEL[o.status]
              return (
                <tr key={o.code} className="align-top">
                  <td className="py-3.5 pr-4">
                    <Link to={`/don-hang?code=${o.code}`} className="font-mono font-medium hover:underline">{o.code}</Link>
                    <p className="text-xs text-ink-mute">{formatDateTime(o.createdAt)}</p>
                  </td>
                  <td className="py-3.5 pr-4">
                    <p>{o.customer.name}</p>
                    <p className="text-xs text-ink-mute">{o.customer.phone} · {o.customer.province}</p>
                  </td>
                  <td className="py-3.5 pr-4">
                    <p className="num">{itemCount(o)} cuốn</p>
                    <p className="max-w-[12rem] truncate text-xs text-ink-mute">{o.items.map((i) => i.title).join(', ')}</p>
                  </td>
                  <td className="py-3.5 pr-4 font-semibold num">{formatMoney(o.total)}</td>
                  <td className="py-3.5 pr-4">
                    <p className="text-xs">{o.payment.name}</p>
                    <p className={`text-xs ${o.payment.paid ? 'text-forest' : 'text-ink-mute'}`}>{o.payment.paid ? 'Đã thu' : 'Chưa thu'}</p>
                    {o.shipping.id === 'express' && <span className="tag mt-1 text-terra">Hỏa tốc</span>}
                  </td>
                  <td className="py-3.5 pr-4"><StatusTag status={o.status} /></td>
                  <td className="py-3.5">
                    <div className="flex justify-end gap-2">
                      {next && (
                        <button type="button" onClick={() => advance(o)} className="btn-ink btn-sm whitespace-nowrap">{next}</button>
                      )}
                      {adminCanCancel(o) && (
                        <ConfirmButton armed={armed === o.code} onArm={() => setArmed(o.code)} onConfirm={() => cancelByAdmin(o)} armedLabel="Xác nhận huỷ">
                          Huỷ
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BooksPanel() {
  const books = useBooks()
  const { remove, adjustStock } = useAdminBooks()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const [editing, setEditing] = useState<BookForm | null>(null)
  const [armed, setArmed] = useState<string>()

  const shown = books.filter(
    (b) => (category === 'all' || b.category === category) && (!q || normalize(`${b.title} ${b.author}`).includes(normalize(q))),
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên sách, tác giả" className="field h-9 max-w-xs py-0" aria-label="Tìm trong kho" />
        <select value={category} onChange={(e) => setCategory(e.target.value as CategoryId | 'all')} className="field h-9 w-auto py-0" aria-label="Lọc thể loại">
          <option value="all">Mọi thể loại</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" onClick={() => setEditing(emptyBookForm())} className="btn-primary btn-sm ml-auto">
          <Icon name="plus" size={14} />
          Thêm sách
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="border-b border-ink text-left">
              {['Sách', 'Thể loại', 'Giá bán', 'Đã bán', 'Tồn kho', ''].map((h) => (
                <th key={h} className="eyebrow py-3 pr-4 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule-soft">
            {shown.map((b) => (
              <tr key={b.id}>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-3">
                    <img src={b.cover} alt="" className="h-12 w-8 shrink-0 bg-paper-deep object-cover" />
                    <div className="min-w-0">
                      <Link to={`/sach/${b.id}`} className="block max-w-[16rem] truncate font-medium hover:underline">{b.title}</Link>
                      <p className="truncate text-xs text-ink-mute">{b.author}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-ink-soft">{categoryName(b.category)}</td>
                <td className="py-2.5 pr-4 num">
                  {formatMoney(unitPrice(b))}
                  {b.dealPrice && <span className="tag ml-2 text-terra">Deal</span>}
                </td>
                <td className="py-2.5 pr-4 num text-ink-soft">{formatNumber(b.sold)}</td>
                <td className="py-2.5 pr-4">
                  <div className="inline-flex items-center border border-rule">
                    <button type="button" onClick={() => adjustStock(b.id, -1)} className="grid h-7 w-7 place-items-center hover:bg-paper-deep" aria-label="Giảm tồn kho"><Icon name="minus" size={12} /></button>
                    <span className={`w-10 text-center num ${b.stock <= 5 ? 'font-semibold text-terra' : ''}`}>{b.stock}</span>
                    <button type="button" onClick={() => adjustStock(b.id, 1)} className="grid h-7 w-7 place-items-center hover:bg-paper-deep" aria-label="Tăng tồn kho"><Icon name="plus" size={12} /></button>
                  </div>
                </td>
                <td className="py-2.5">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditing(toForm(b))} className="btn-ghost btn-sm">Sửa</button>
                    <ConfirmButton armed={armed === b.id} onArm={() => setArmed(b.id)} onConfirm={() => remove(b)} armedLabel="Xác nhận xoá">
                      Xoá
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="py-10 text-center text-sm text-ink-mute">Không có sách phù hợp.</p>}
      </div>

      {editing && <BookEditor initial={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function BookEditor({ initial, onClose }: { initial: BookForm; onClose: () => void }) {
  const { save } = useAdminBooks()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<BookFormErrors>({})
  const set = (k: keyof BookForm) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function submit(e: FormEvent) {
    e.preventDefault()
    const found = validateBookForm(form)
    setErrors(found)
    if (hasErrors(found)) return
    if (save(form).ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title={initial.id ? 'Sửa thông tin sách' : 'Thêm sách mới'} width="max-w-2xl">
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextField className="sm:col-span-2" label="Tên sách" value={form.title} onChange={set('title')} error={errors.title} />
        <TextField label="Tên nguyên tác" value={form.originalTitle} onChange={set('originalTitle')} />
        <TextField label="Tác giả" value={form.author} onChange={set('author')} error={errors.author} />
        <TextField label="Đơn vị phát hành" value={form.publisher} onChange={set('publisher')} />
        <SelectField label="Thể loại" value={form.category} onChange={set('category')}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        <TextField label="Giá bìa (đ)" inputMode="numeric" value={form.listPrice} onChange={set('listPrice')} error={errors.listPrice} />
        <TextField label="Giá bán (đ)" inputMode="numeric" value={form.price} onChange={set('price')} error={errors.price} />
        <TextField label="Giá tốt hôm nay (đ)" inputMode="numeric" value={form.dealPrice} onChange={set('dealPrice')} error={errors.dealPrice} hint="Bỏ trống nếu không khuyến mãi" />
        <TextField label="Tồn kho" inputMode="numeric" value={form.stock} onChange={set('stock')} error={errors.stock} />
        <TextField label="Số trang" inputMode="numeric" value={form.pages} onChange={set('pages')} />
        <TextField label="Năm xuất bản lần đầu" inputMode="numeric" value={form.firstPublished} onChange={set('firstPublished')} error={errors.firstPublished} />
        <TextField className="sm:col-span-2" label="Ảnh bìa (URL)" value={form.cover} onChange={set('cover')} error={errors.cover} hint="Bỏ trống sẽ hiển thị bìa chữ mặc định" />
        <TextArea className="sm:col-span-2" label="Giới thiệu" rows={4} value={form.description} onChange={set('description')} />
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn-ghost">Huỷ</button>
          <button type="submit" className="btn-ink">{initial.id ? 'Lưu thay đổi' : 'Thêm vào kho'}</button>
        </div>
      </form>
    </Modal>
  )
}

function TicketsPanel() {
  const { tickets, toggle } = useTickets()
  if (!tickets.length) return <EmptyState title="Chưa có yêu cầu hỗ trợ">Yêu cầu gửi từ trang Hỗ trợ sẽ xuất hiện ở đây.</EmptyState>
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {[...tickets].reverse().map((t) => (
        <li key={t.code} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-mono text-sm font-medium">{t.code}</span>
              <span className="tag text-ink-soft">{TICKET_TOPICS[t.topic]}</span>
              {t.orderCode && <Link to={`/don-hang?code=${t.orderCode}`} className="font-mono text-xs link">{t.orderCode}</Link>}
              <span className="text-xs text-ink-mute">{formatDate(t.at)}</span>
            </div>
            <p className="mt-2 text-sm">
              <span className="font-semibold">{t.name}</span> <span className="text-ink-mute">· {t.email}{t.phone && ` · ${t.phone}`}</span>
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t.message}</p>
            {t.attachment && <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-mute"><Icon name="paperclip" size={12} />{t.attachment}</p>}
          </div>
          <button
            type="button"
            onClick={() => toggle(t)}
            className={`btn-sm self-start ${t.status === 'open' ? 'btn-ink' : 'btn-ghost'}`}
          >
            {t.status === 'open' ? 'Đánh dấu đã xử lý' : 'Mở lại'}
          </button>
        </li>
      ))}
    </ul>
  )
}
