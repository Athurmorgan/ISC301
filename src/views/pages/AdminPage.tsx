import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, STATUS_LABEL, TICKET_TOPICS, categoryName } from '../../data/catalog'
import { emptyBookForm, toForm, useAdminBooks, validateBookForm, type BookForm, type BookFormErrors } from '../../controllers/useAdminBooks'
import { useAuth } from '../../controllers/useAuth'
import { useBooks } from '../../controllers/useBooks'
import { useBuybacks } from '../../controllers/useBuyback'
import { useAllReviews, useTickets } from '../../controllers/useFeedback'
import { useAllOrders, useOrderActions } from '../../controllers/useOrders'
import { useStore } from '../../controllers/useStore'
import { formatDate, formatDateTime, formatMoney, formatNumber, normalize } from '../../models/format'
import { NEXT_ACTION_LABEL, adminCanCancel, itemCount } from '../../models/order'
import { unitPrice } from '../../models/pricing'
import type { CategoryId, Coupon, CouponKind, OrderStatus } from '../../models/types'
import { hasErrors } from '../../models/validation'
import { BUYBACK_STATUS_LABEL } from '../../services/buybackRepository'
import { couponRepository, couponsStore } from '../../services/couponRepository'
import { serverStatus, syncBooks } from '../../services/syncService'
import { notify } from '../../services/toastService'
import { usersStore } from '../../services/userRepository'
import { Icon } from '../components/Icon'
import { LivePanel } from '../components/LivePanel'
import { Rating } from '../components/Rating'
import { ConfirmButton, EmptyState, Modal, SelectField, StatusTag, TextArea, TextField } from '../components/ui'

type Tab = 'live' | 'orders' | 'books' | 'buybacks' | 'coupons' | 'customers' | 'reviews' | 'tickets'

export function AdminPage() {
  const { user, isAdmin, logout } = useAuth()
  const orders = useAllOrders()
  const books = useBooks()
  const { tickets } = useTickets()
  const { requests: buybacks } = useBuybacks()
  const coupons = useStore(couponsStore)
  const users = useStore(usersStore)
  const { reviews } = useAllReviews()
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
    { label: 'Thu mua cần xử lý', value: formatNumber(buybacks.filter((b) => b.status === 'pending' || b.status === 'inspecting').length), note: 'yêu cầu sách cũ' },
    { label: 'Yêu cầu hỗ trợ', value: formatNumber(tickets.filter((t) => t.status === 'open').length), note: 'phiếu hỗ trợ' },
  ]
  const TABS: Record<Tab, string> = {
    live: 'Trực tiếp',
    orders: `Đơn hàng (${orders.length})`,
    books: `Kho sách (${books.length})`,
    buybacks: `Thu mua cũ (${buybacks.length})`,
    coupons: `Mã giảm (${coupons.length})`,
    customers: `Khách hàng (${users.length})`,
    reviews: `Đánh giá (${reviews.length})`,
    tickets: `Hỗ trợ (${tickets.length})`,
  }

  return (
    <div className="container-page pt-10 sm:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-6">
        <div>
          <p className="eyebrow">Quản trị</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Bàn làm việc</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ServerBadge />
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

      <div className="mt-8 flex gap-6 overflow-x-auto border-b border-rule" role="tablist">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px shrink-0 border-b-2 pb-3 text-sm ${tab === t ? 'border-ink font-semibold text-ink' : 'border-transparent text-ink-mute hover:text-ink'}`}
          >
            {TABS[t]}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'live' && <LivePanel />}
        {tab === 'orders' && <OrdersPanel />}
        {tab === 'books' && <BooksPanel />}
        {tab === 'buybacks' && <BuybacksPanel />}
        {tab === 'coupons' && <CouponsPanel />}
        {tab === 'customers' && <CustomersPanel />}
        {tab === 'reviews' && <ReviewsPanel />}
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

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, cover: 'Dung lượng ảnh tối đa 2MB' }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm((f) => ({ ...f, cover: reader.result as string }))
      setErrors((prev) => ({ ...prev, cover: undefined }))
    }
    reader.readAsDataURL(file)
  }

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
        
        <div className="sm:col-span-2 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <TextField label="Ảnh bìa (URL hoặc Tải lên từ máy)" value={form.cover} onChange={set('cover')} error={errors.cover} hint="Nhập link ảnh hoặc bấm nút tải file bên cạnh" />
            </div>
            <div className="shrink-0 mb-1">
              <label className="btn-ghost btn-sm cursor-pointer inline-flex items-center gap-1.5">
                <Icon name="upload" size={15} />
                <span>Tải ảnh từ máy</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
              </label>
            </div>
          </div>
          {form.cover && (
            <div className="flex items-center gap-3 border border-rule bg-paper p-2">
              <img src={form.cover} alt="Xem trước bìa" className="h-16 w-11 object-cover border border-rule" />
              <span className="text-xs text-ink-mute truncate max-w-xs">{form.cover.slice(0, 50)}...</span>
              <button type="button" onClick={() => setForm((f) => ({ ...f, cover: '' }))} className="btn-ghost btn-sm text-terra ml-auto">Xoá ảnh</button>
            </div>
          )}
        </div>

        <TextArea className="sm:col-span-2" label="Giới thiệu" rows={4} value={form.description} onChange={set('description')} />
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn-ghost">Huỷ</button>
          <button type="submit" className="btn-ink">{initial.id ? 'Lưu thay đổi' : 'Thêm vào kho'}</button>
        </div>
      </form>
    </Modal>
  )
}

function BuybacksPanel() {
  const { requests, advance, importToInventory } = useBuybacks()
  const [filter, setFilter] = useState<string>('all')

  const shown = useMemo(() => {
    return filter === 'all' ? requests : requests.filter((r) => r.status === filter)
  }, [requests, filter])

  if (!requests.length) {
    return <EmptyState title="Chưa có yêu cầu thu mua sách nào" />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'collecting', 'inspecting', 'paid', 'rejected'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`h-8 border px-3 text-xs ${filter === s ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-soft hover:border-ink'}`}
          >
            {s === 'all' ? 'Tất cả' : BUYBACK_STATUS_LABEL[s as keyof typeof BUYBACK_STATUS_LABEL]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[54rem] text-sm">
          <thead>
            <tr className="border-b border-ink text-left">
              {['Mã / Ngày', 'Sách bán lại', 'Khách hàng', 'Định giá & Ngân hàng', 'Trạng thái', 'Thao tác'].map((h) => (
                <th key={h} className="eyebrow py-3 pr-4 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule-soft">
            {shown.map((b) => (
              <tr key={b.code} className="align-top">
                <td className="py-3.5 pr-4">
                  <p className="font-mono font-medium">{b.code}</p>
                  <p className="text-xs text-ink-mute">{formatDate(b.createdAt)}</p>
                </td>
                <td className="py-3.5 pr-4">
                  <p className="font-medium text-ink">{b.bookTitle}</p>
                  <p className="text-xs text-ink-mute">{b.author} · {b.condition === 'likenew' ? 'Như mới (98%)' : 'Đã dùng (90%)'}</p>
                </td>
                <td className="py-3.5 pr-4">
                  <p>{b.customerName}</p>
                  <p className="text-xs text-ink-mute">{b.phone}</p>
                  <p className="text-2xs text-ink-soft truncate max-w-[12rem]">{b.address}</p>
                </td>
                <td className="py-3.5 pr-4">
                  <p className="font-semibold text-forest num">{formatMoney(b.estimatedPrice)}</p>
                  <p className="text-2xs text-ink-mute">{b.bankName} · {b.bankAccount}</p>
                  <p className="text-2xs text-ink-mute">{b.accountHolder}</p>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="tag text-xs">{BUYBACK_STATUS_LABEL[b.status]}</span>
                </td>
                <td className="py-3.5">
                  <div className="flex flex-col gap-1.5 items-end">
                    {b.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => advance(b, 'collecting', 'Điều phối bưu tá đến lấy sách tận nhà')}
                        className="btn-ink btn-sm whitespace-nowrap"
                      >
                        Hẹn lấy sách
                      </button>
                    )}
                    {b.status === 'collecting' && (
                      <button
                        type="button"
                        onClick={() => advance(b, 'inspecting', 'Đã nhận sách tại kho, bắt đầu kiểm định chất lượng')}
                        className="btn-ink btn-sm whitespace-nowrap"
                      >
                        Đã nhận, kiểm định
                      </button>
                    )}
                    {b.status === 'inspecting' && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => advance(b, 'paid', `Kiểm định đạt chuẩn. Đã chuyển khoản ${formatMoney(b.estimatedPrice)}`)}
                          className="btn-ink btn-sm whitespace-nowrap"
                        >
                          Duyệt & Chuyển tiền
                        </button>
                        <button
                          type="button"
                          onClick={() => advance(b, 'rejected', 'Sách không đạt chuẩn kiểm định của BookWise')}
                          className="btn-ghost btn-sm text-terra"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                    {b.status === 'paid' && (
                      <button
                        type="button"
                        onClick={() => importToInventory(b)}
                        className="btn-outline btn-sm whitespace-nowrap"
                      >
                        +1 Nhập kho sách
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="py-8 text-center text-sm text-ink-mute">Không có yêu cầu thu mua nào.</p>}
      </div>
    </div>
  )
}

function CouponsPanel() {
  const coupons = useStore(couponsStore)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)

  function handleDelete(code: string) {
    couponRepository.remove(code)
    notify(`Đã xoá mã giảm giá ${code}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-rule pb-3">
        <p className="text-sm text-ink-soft">Danh sách mã khuyến mãi đang áp dụng trong giỏ hàng</p>
        <button
          type="button"
          onClick={() => {
            setEditing({
              code: '',
              kind: 'fixed',
              value: 20000,
              minSubtotal: 100000,
              description: '',
            })
            setModalOpen(true)
          }}
          className="btn-primary btn-sm"
        >
          <Icon name="plus" size={14} /> Thêm mã mới
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="border-b border-ink text-left">
              {['Mã code', 'Loại giảm', 'Giá trị', 'Đơn tối thiểu', 'Mô tả', ''].map((h) => (
                <th key={h} className="eyebrow py-3 pr-4 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule-soft">
            {coupons.map((c) => (
              <tr key={c.code}>
                <td className="py-3 pr-4 font-mono font-bold text-ink">{c.code}</td>
                <td className="py-3 pr-4 text-xs">
                  {c.kind === 'fixed' && 'Giảm tiền cố định'}
                  {c.kind === 'percent' && 'Giảm theo %'}
                  {c.kind === 'shipping' && 'Giảm phí ship'}
                </td>
                <td className="py-3 pr-4 font-semibold num">
                  {c.kind === 'percent' ? `${c.value}%` : formatMoney(c.value)}
                  {c.cap ? ` (Tối đa ${formatMoney(c.cap)})` : ''}
                </td>
                <td className="py-3 pr-4 num text-ink-soft">{formatMoney(c.minSubtotal)}</td>
                <td className="py-3 pr-4 text-xs text-ink-soft">{c.description}</td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(c.code)}
                    className="btn-ghost btn-sm text-terra"
                    title="Xoá mã"
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && editing && (
        <CouponEditor
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSave={(coupon) => {
            couponRepository.save(coupon)
            notify(`Đã lưu mã giảm giá ${coupon.code}`)
            setModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

function CouponEditor({ initial, onClose, onSave }: { initial: Coupon; onClose: () => void; onSave: (c: Coupon) => void }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) return setError('Vui lòng nhập mã code')
    if (form.value <= 0) return setError('Giá trị giảm phải lớn hơn 0')
    if (form.kind === 'percent' && form.value > 100) return setError('Phần trăm giảm tối đa là 100')
    if (form.minSubtotal < 0) return setError('Đơn tối thiểu không được âm')
    const description =
      form.description.trim() ||
      (form.kind === 'percent'
        ? `Giảm ${form.value}% cho đơn từ ${formatMoney(form.minSubtotal)}`
        : `Giảm ${formatMoney(form.value)} cho đơn từ ${formatMoney(form.minSubtotal)}`)
    onSave({ ...form, code: form.code.trim(), description })
  }

  return (
    <Modal open onClose={onClose} title="Tạo mã giảm giá mới" width="max-w-md">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField
          label="Mã code (Viết hoa không dấu)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          placeholder="VD: BOOKWISE20"
          required
        />
        <SelectField
          label="Loại giảm giá"
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value as CouponKind })}
        >
          <option value="fixed">Giảm tiền trực tiếp (VNĐ)</option>
          <option value="percent">Giảm theo phần trăm (%)</option>
          <option value="shipping">Miễn / Giảm phí giao hàng (VNĐ)</option>
        </SelectField>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={form.kind === 'percent' ? 'Phần trăm (%)' : 'Số tiền giảm (đ)'}
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            required
          />
          <TextField
            label="Đơn tối thiểu (đ)"
            type="number"
            value={form.minSubtotal}
            onChange={(e) => setForm({ ...form, minSubtotal: Number(e.target.value) })}
            required
          />
          {form.kind === 'percent' && (
            <TextField
              className="col-span-2"
              label="Giảm tối đa (đ)"
              type="number"
              value={form.cap ?? ''}
              onChange={(e) => setForm({ ...form, cap: e.target.value ? Number(e.target.value) : undefined })}
            />
          )}
        </div>
        <TextField
          label="Mô tả hiển thị"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Giảm 20.000đ cho đơn từ 150.000đ"
        />
        {error && <p className="text-sm text-terra">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Huỷ</button>
          <button type="submit" className="btn-ink">Lưu mã</button>
        </div>
      </form>
    </Modal>
  )
}

function CustomersPanel() {
  const users = useStore(usersStore)
  const orders = useAllOrders()

  const customerStats = useMemo(() => {
    return users.map((u) => {
      const userOrders = orders.filter((o) => o.userEmail === u.email && o.status !== 'cancelled')
      const totalSpent = userOrders.reduce((sum, o) => sum + o.total, 0)
      return {
        ...u,
        orderCount: userOrders.length,
        totalSpent,
      }
    })
  }, [users, orders])

  if (!users.length) {
    return <EmptyState title="Chưa có khách hàng đăng ký tài khoản nào" />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[50rem] text-sm">
        <thead>
          <tr className="border-b border-ink text-left">
            {['Khách hàng', 'Email', 'Điện thoại', 'Ngày đăng ký', 'Đơn hàng', 'Tổng chi tiêu'].map((h) => (
              <th key={h} className="eyebrow py-3 pr-4 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule-soft">
          {customerStats.map((c) => (
            <tr key={c.email}>
              <td className="py-3 pr-4 font-medium text-ink">
                {c.name}
                {c.role === 'admin' && <span className="tag ml-2 text-forest">Admin</span>}
              </td>
              <td className="py-3 pr-4 text-xs font-mono text-ink-soft">{c.email}</td>
              <td className="py-3 pr-4 text-xs num">{c.phone || '—'}</td>
              <td className="py-3 pr-4 text-xs text-ink-mute">{formatDate(c.createdAt)}</td>
              <td className="py-3 pr-4 num text-center">{c.orderCount} đơn</td>
              <td className="py-3 pr-4 font-semibold num">{formatMoney(c.totalSpent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReviewsPanel() {
  const { reviews, remove } = useAllReviews()
  const books = useBooks()

  function getBookTitle(id: string) {
    return books.find((b) => b.id === id)?.title ?? id
  }

  if (!reviews.length) {
    return <EmptyState title="Chưa có đánh giá nào từ độc giả" />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-rule pb-3">
        <p className="text-sm text-ink-soft">Tổng số <strong>{reviews.length}</strong> bài đánh giá độc giả gửi</p>
      </div>
      <ul className="divide-y divide-rule border-y border-rule">
        {[...reviews].reverse().map((r) => (
          <li key={r.at} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm">{r.name}</span>
                {r.verifiedPurchase && (
                  <span className="inline-flex items-center gap-1 bg-forest-tint px-2 py-0.5 text-2xs font-semibold text-forest">
                    <Icon name="check" size={10} /> Đã mua hàng
                  </span>
                )}
                <span className="text-xs text-ink-mute">· {formatDate(r.at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Rating value={r.rating} />
                <span className="text-xs text-ink-soft font-medium">sách: <Link to={`/sach/${r.bookId}`} className="hover:underline font-normal text-ink">“{getBookTitle(r.bookId)}”</Link></span>
              </div>
              <p className="text-sm text-ink-soft mt-1 leading-relaxed max-w-2xl">{r.body}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                remove(r.at)
                notify('Đã xoá đánh giá')
              }}
              className="btn-ghost btn-sm text-terra self-end sm:self-start"
            >
              Xoá
            </button>
          </li>
        ))}
      </ul>
    </div>
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

const SERVER_LABEL = {
  off: 'Chế độ offline (chưa cấu hình máy chủ)',
  checking: 'Đang kết nối máy chủ…',
  online: 'Đã đồng bộ máy chủ',
  offline: 'Mất kết nối máy chủ — đang dùng dữ liệu trên máy',
} as const

/** Trạng thái kết nối backend; bấm để đồng bộ lại danh mục và tồn kho */
function ServerBadge() {
  const { state, syncedAt } = useStore(serverStatus)
  const dot = state === 'online' ? 'bg-forest' : state === 'offline' ? 'bg-terra' : 'bg-ink-mute'
  return (
    <button
      type="button"
      disabled={state === 'off'}
      onClick={() => void syncBooks().then((ok) => (ok ? notify('Đã đồng bộ sách và tồn kho') : notify('Không kết nối được máy chủ')))}
      title={syncedAt ? `Lần cuối: ${formatDateTime(syncedAt)}` : undefined}
      className="inline-flex items-center gap-2 px-2 text-xs text-ink-soft hover:text-ink disabled:cursor-default"
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {SERVER_LABEL[state]}
    </button>
  )
}
