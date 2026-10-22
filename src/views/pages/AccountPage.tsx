import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PROVINCES, STATUS_LABEL, TICKET_TOPICS } from '../../data/catalog'
import { useAuth } from '../../controllers/useAuth'
import { useTickets } from '../../controllers/useFeedback'
import { useAllOrders } from '../../controllers/useOrders'
import { formatDate, formatMoney } from '../../models/format'
import { itemCount } from '../../models/order'
import type { Address, OrderStatus, User } from '../../models/types'
import { hasErrors, isVietnamesePhone, type Errors } from '../../models/validation'
import { notify } from '../../services/toastService'
import { EmptyState, SelectField, StatusTag, TextField } from '../components/ui'

export function AccountPage() {
  const { user } = useAuth()
  useEffect(() => {
    document.title = 'Tài khoản — BookWise'
  }, [])

  if (!user) return <AuthForms />
  if (user.role === 'admin') return <AdminLanding user={user} />
  return <CustomerAccount user={user} />
}

function AuthForms() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  return (
    <div className="container-page grid gap-12 pt-10 sm:pt-16 lg:grid-cols-2 lg:gap-20">
      <div className="lg:pt-6">
        <p className="eyebrow">Tài khoản BookWise</p>
        <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">Đăng nhập để theo dõi đơn và đặt sách nhanh hơn.</h1>
        <ul className="mt-8 space-y-3 text-ink-soft">
          {['Lưu địa chỉ, tự điền khi thanh toán', 'Xem lại mọi đơn hàng và trạng thái giao', 'Theo dõi yêu cầu hỗ trợ đã gửi'].map((t, i) => (
            <li key={t} className="flex gap-3">
              <span className="font-mono text-sm text-ink-mute">0{i + 1}</span>
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-10 border-l-2 border-forest pl-4 text-sm text-ink-soft">
          Tài khoản quản trị demo: <span className="font-mono text-ink">admin@bookwise.vn</span> / <span className="font-mono text-ink">admin123</span>
        </p>
      </div>

      <div className="border border-ink bg-card">
        <div className="grid grid-cols-2 border-b border-rule" role="tablist">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-14 text-sm font-semibold ${tab === t ? 'bg-card text-ink shadow-[inset_0_-2px_0_var(--color-ink)]' : 'bg-paper-deep text-ink-mute hover:text-ink'}`}
            >
              {t === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </button>
          ))}
        </div>
        <div className="p-6 sm:p-8">{tab === 'login' ? <LoginForm /> : <RegisterForm />}</div>
      </div>
    </div>
  )
}

function LoginForm() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = login(email, password)
    if (!r.ok) return setError(r.error)
    notify(`Chào mừng trở lại, ${r.value.name}`)
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Mật khẩu" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-sm text-terra">{error}</p>}
      <button type="submit" className="btn-ink w-full">
        Đăng nhập
      </button>
    </form>
  )
}

function RegisterForm() {
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = register(form)
    if (!r.ok) return setError(r.error)
    notify(`Đã tạo tài khoản cho ${r.value.name}`)
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <TextField label="Họ và tên" autoComplete="name" value={form.name} onChange={set('name')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
        <TextField label="Số điện thoại" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
      </div>
      <TextField label="Mật khẩu" type="password" autoComplete="new-password" hint="Ít nhất 6 ký tự" value={form.password} onChange={set('password')} />
      {error && <p className="text-sm text-terra">{error}</p>}
      <button type="submit" className="btn-ink w-full">
        Tạo tài khoản
      </button>
    </form>
  )
}

function AdminLanding({ user }: { user: User }) {
  const { logout } = useAuth()
  return (
    <div className="container-page max-w-2xl pt-16">
      <EmptyState
        title={`Bạn đang đăng nhập với quyền quản trị`}
        action={
          <div className="flex justify-center gap-3">
            <Link to="/quan-tri" className="btn-ink">
              Mở trang quản trị
            </Link>
            <button type="button" onClick={logout} className="btn-ghost">
              Đăng xuất
            </button>
          </div>
        }
      >
        {user.email}
      </EmptyState>
    </div>
  )
}

type Tab = 'orders' | 'profile' | 'tickets'
const TABS: Record<Tab, string> = { orders: 'Đơn hàng', profile: 'Hồ sơ & địa chỉ', tickets: 'Yêu cầu hỗ trợ' }

function CustomerAccount({ user }: { user: User }) {
  const { logout } = useAuth()
  const [tab, setTab] = useState<Tab>('orders')

  return (
    <div className="container-page pt-10 sm:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-6">
        <div>
          <p className="eyebrow">Tài khoản</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Xin chào, {user.name.split(' ').pop()}</h1>
          <p className="mt-1 text-sm text-ink-mute">
            {user.email} · thành viên từ {formatDate(user.createdAt)}
          </p>
        </div>
        <button type="button" onClick={logout} className="btn-ghost btn-sm">
          Đăng xuất
        </button>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[12rem_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" role="tablist" aria-label="Mục tài khoản">
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`shrink-0 px-3 py-2.5 text-left text-sm ${tab === t ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-deep hover:text-ink'}`}
            >
              {TABS[t]}
            </button>
          ))}
        </nav>
        <div>
          {tab === 'orders' && <MyOrders user={user} />}
          {tab === 'profile' && <Profile user={user} />}
          {tab === 'tickets' && <MyTickets user={user} />}
        </div>
      </div>
    </div>
  )
}

function MyOrders({ user }: { user: User }) {
  const all = useAllOrders()
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const mine = useMemo(
    () => all.filter((o) => o.userEmail === user.email).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all, user.email],
  )
  const shown = filter === 'all' ? mine : mine.filter((o) => o.status === filter)

  if (!mine.length) {
    return (
      <EmptyState title="Bạn chưa có đơn hàng nào" action={<Link to="/sach" className="btn-ink">Chọn sách</Link>}>
        Các đơn đặt khi đã đăng nhập sẽ xuất hiện ở đây.
      </EmptyState>
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {(['all', 'pending', 'confirmed', 'shipping', 'delivered', 'cancelled'] as const).map((s) => {
          const n = s === 'all' ? mine.length : mine.filter((o) => o.status === s).length
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`h-8 border px-3 text-xs ${filter === s ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-soft hover:border-ink'}`}
            >
              {s === 'all' ? 'Tất cả' : STATUS_LABEL[s]} <span className="num opacity-60">{n}</span>
            </button>
          )
        })}
      </div>
      {shown.length ? (
        <ul className="divide-y divide-rule border-y border-rule">
          {shown.map((o) => (
            <li key={o.code}>
              <Link to={`/don-hang?code=${o.code}`} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-4 hover:bg-card sm:grid-cols-[8rem_1fr_8rem_7rem] sm:px-2">
                <span className="font-mono font-medium">{o.code}</span>
                <span className="flex -space-x-3 sm:order-none">
                  {o.items.slice(0, 4).map((i) => (
                    <img key={`${i.bookId}-${i.condition}`} src={i.cover} alt="" className="h-12 w-8 border-2 border-paper bg-paper-deep object-cover" />
                  ))}
                  <span className="pl-5 text-xs text-ink-mute self-center">
                    {itemCount(o)} cuốn · {formatDate(o.createdAt)}
                  </span>
                </span>
                <StatusTag status={o.status} />
                <span className="text-right font-semibold num">{formatMoney(o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-sm text-ink-mute">Không có đơn ở trạng thái này.</p>
      )}
    </div>
  )
}

function Profile({ user }: { user: User }) {
  const { updateProfile } = useAuth()
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone)
  const [address, setAddress] = useState<Partial<Address>>(user.address)
  const [errors, setErrors] = useState<Errors<{ name: string; phone: string }>>({})

  function submit(e: FormEvent) {
    e.preventDefault()
    const found = {
      name: name.trim().length < 2 ? 'Nhập họ tên' : undefined,
      phone: !isVietnamesePhone(phone) ? 'Số điện thoại chưa đúng' : undefined,
    }
    setErrors(found)
    if (hasErrors(found)) return
    updateProfile({ name: name.trim(), phone: phone.trim(), address })
    notify('Đã lưu hồ sơ')
  }

  const setA = (k: keyof Address, v: string) => setAddress((a) => ({ ...a, [k]: v, ...(k === 'province' ? { district: '' } : {}) }))

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-10" noValidate>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="eyebrow mb-4 w-full border-b border-rule pb-2">Thông tin cá nhân</legend>
        <TextField label="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <TextField label="Số điện thoại" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
        <TextField className="sm:col-span-2" label="Email" value={user.email} disabled hint="Email dùng để đăng nhập, không thể thay đổi" />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="eyebrow mb-4 w-full border-b border-rule pb-2">Địa chỉ giao hàng mặc định</legend>
        <TextField label="Người nhận" value={address.name ?? ''} onChange={(e) => setA('name', e.target.value)} />
        <TextField label="SĐT người nhận" type="tel" value={address.phone ?? ''} onChange={(e) => setA('phone', e.target.value)} />
        <SelectField label="Tỉnh / thành phố" value={address.province ?? ''} onChange={(e) => setA('province', e.target.value)}>
          <option value="">Chọn tỉnh/thành</option>
          {Object.keys(PROVINCES).map((p) => (
            <option key={p}>{p}</option>
          ))}
        </SelectField>
        <SelectField label="Quận / huyện" value={address.district ?? ''} onChange={(e) => setA('district', e.target.value)} disabled={!address.province}>
          <option value="">Chọn quận/huyện</option>
          {(PROVINCES[address.province ?? ''] ?? []).map((d) => (
            <option key={d}>{d}</option>
          ))}
        </SelectField>
        <TextField className="sm:col-span-2" label="Số nhà, tên đường" value={address.street ?? ''} onChange={(e) => setA('street', e.target.value)} />
      </fieldset>

      <button type="submit" className="btn-ink">
        Lưu thay đổi
      </button>
    </form>
  )
}

function MyTickets({ user }: { user: User }) {
  const { tickets } = useTickets()
  const mine = tickets.filter((t) => t.email.toLowerCase() === user.email)
  if (!mine.length) {
    return (
      <EmptyState title="Chưa có yêu cầu hỗ trợ" action={<Link to="/ho-tro" className="btn-ghost">Gửi yêu cầu</Link>}>
        Các yêu cầu gửi bằng email {user.email} sẽ hiển thị tại đây.
      </EmptyState>
    )
  }
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {[...mine].reverse().map((t) => (
        <li key={t.code} className="py-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-mono text-sm font-medium">{t.code}</span>
            <span className="text-sm">{TICKET_TOPICS[t.topic]}</span>
            <span className={`text-xs font-semibold ${t.status === 'open' ? 'text-terra' : 'text-forest'}`}>{t.status === 'open' ? 'Đang xử lý' : 'Đã giải quyết'}</span>
            <span className="ml-auto text-xs text-ink-mute">{formatDate(t.at)}</span>
          </div>
          <p className="mt-2 text-sm text-ink-soft line-clamp-2">{t.message}</p>
        </li>
      ))}
    </ul>
  )
}
