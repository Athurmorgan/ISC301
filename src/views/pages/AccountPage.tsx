import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PROVINCES, STATUS_LABEL, TICKET_TOPICS } from '../../data/catalog'
import { useAuth } from '../../controllers/useAuth'
import { useBuybacks } from '../../controllers/useBuyback'
import { useCart } from '../../controllers/useCart'
import { useTickets } from '../../controllers/useFeedback'
import { useAllOrders } from '../../controllers/useOrders'
import { useWishlist } from '../../controllers/useWishlist'
import { formatDate, formatDateTime, formatMoney } from '../../models/format'
import { itemCount } from '../../models/order'
import { unitPrice } from '../../models/pricing'
import type { Address, OrderStatus, User } from '../../models/types'
import { hasErrors, isVietnamesePhone, type Errors } from '../../models/validation'
import { BUYBACK_STATUS_LABEL } from '../../services/buybackRepository'
import { notify } from '../../services/toastService'
import { Icon } from '../components/Icon'
import { EmptyState, Modal, SelectField, StatusTag, TextField } from '../components/ui'

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
          {['Lưu địa chỉ, tự điền khi thanh toán', 'Xem lại mọi đơn hàng và trạng thái giao', 'Theo dõi yêu cầu hỗ trợ & bán lại sách', 'Lưu tủ sách yêu thích cá nhân'].map((t, i) => (
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
  const [showForgot, setShowForgot] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = login(email, password)
    if (!r.ok) return setError(r.error)
    notify(`Chào mừng trở lại, ${r.value.name}`)
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <TextField label="Mật khẩu" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="mt-1 text-right">
            <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-ink-mute hover:text-ink underline">
              Quên mật khẩu?
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-terra">{error}</p>}
        <button type="submit" className="btn-ink w-full">
          Đăng nhập
        </button>
      </form>
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </>
  )
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState('')

  function handleSendOtp(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      return setError('Vui lòng nhập email hợp lệ')
    }
    setError('')
    setStep(2)
    notify('Mã OTP xác thực đã được gửi! (Mã thử nghiệm demo: 123456)')
  }

  function handleReset(e: FormEvent) {
    e.preventDefault()
    const res = resetPassword(email, otp, newPassword)
    if (!res.ok) return setError(res.error)
    notify('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Đặt lại mật khẩu" width="max-w-md">
      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
          <p className="text-sm text-ink-soft">Nhập email tài khoản của bạn để nhận mã xác thực OTP.</p>
          <TextField label="Email tài khoản" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-sm text-terra">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Huỷ</button>
            <button type="submit" className="btn-ink">Gửi mã OTP</button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          <div className="border border-forest/30 bg-forest-tint p-3 text-xs text-forest">
            Đã gửi mã xác thực tới <strong>{email}</strong>.<br />
            Mã OTP mẫu cho bản demo: <strong className="font-mono text-sm">123456</strong>
          </div>
          <TextField label="Mã OTP" maxLength={6} placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} />
          <TextField label="Mật khẩu mới" type="password" hint="Ít nhất 6 ký tự" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          {error && <p className="text-sm text-terra">{error}</p>}
          <div className="flex justify-between items-center gap-2 pt-2">
            <button type="button" onClick={() => setStep(1)} className="text-xs text-ink-mute hover:underline">Quay lại</button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost">Huỷ</button>
              <button type="submit" className="btn-ink">Lưu mật khẩu</button>
            </div>
          </div>
        </form>
      )}
    </Modal>
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

type Tab = 'orders' | 'wishlist' | 'buyback' | 'profile' | 'password' | 'tickets'
const TABS: Record<Tab, string> = {
  orders: 'Đơn hàng',
  wishlist: 'Yêu thích',
  buyback: 'Bán sách cũ',
  profile: 'Hồ sơ & địa chỉ',
  password: 'Đổi mật khẩu',
  tickets: 'Yêu cầu hỗ trợ',
}

function CustomerAccount({ user }: { user: User }) {
  const { logout } = useAuth()
  const [params, setParams] = useSearchParams()
  // Đọc tab từ URL để nút trái tim trên header mở đúng mục cả khi đang ở trang này
  const fromUrl = params.get('tab') as Tab | null
  const tab: Tab = fromUrl && fromUrl in TABS ? fromUrl : 'orders'
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })

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

      <div className="mt-8 grid gap-10 lg:grid-cols-[13rem_1fr]">
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
          {tab === 'wishlist' && <MyWishlist />}
          {tab === 'buyback' && <MyBuybacks user={user} />}
          {tab === 'profile' && <Profile user={user} />}
          {tab === 'password' && <ChangePasswordForm />}
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

function MyWishlist() {
  const { wishlistBooks, remove } = useWishlist()
  const { add } = useCart()

  if (!wishlistBooks.length) {
    return (
      <EmptyState title="Tủ sách yêu thích đang trống" action={<Link to="/sach" className="btn-ink">Khám phá sách</Link>}>
        Bạn có thể bấm vào biểu tượng trái tim ở bất kỳ cuốn sách nào để lưu lại tại đây.
      </EmptyState>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <p className="text-sm text-ink-soft">Có <strong>{wishlistBooks.length}</strong> cuốn trong danh sách yêu thích</p>
      </div>
      <ul className="divide-y divide-rule border-y border-rule">
        {wishlistBooks.map((b) => (
          <li key={b.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link to={`/sach/${b.id}`} className="shrink-0">
                <img src={b.cover} alt="" className="h-16 w-11 bg-paper-deep object-cover border border-rule" />
              </Link>
              <div className="min-w-0">
                <Link to={`/sach/${b.id}`} className="block truncate font-medium text-sm hover:underline">
                  {b.title}
                </Link>
                <p className="text-xs text-ink-mute">{b.author}</p>
                <p className="mt-1 font-semibold text-sm num">{formatMoney(unitPrice(b))}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => add(b, 'seal', 1)}
                disabled={b.stock === 0}
                className="btn-ink btn-sm"
              >
                {b.stock === 0 ? 'Tạm hết hàng' : 'Thêm vào giỏ'}
              </button>
              <button
                type="button"
                onClick={() => remove(b.id)}
                className="btn-ghost btn-sm text-ink-mute hover:text-terra"
                title="Bỏ yêu thích"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MyBuybacks({ user }: { user: User }) {
  const { requests } = useBuybacks()
  const mine = useMemo(
    () =>
      requests
        .filter((r) => r.email?.toLowerCase() === user.email.toLowerCase() || r.phone === user.phone)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests, user],
  )

  if (!mine.length) {
    return (
      <EmptyState
        title="Chưa có yêu cầu bán lại sách nào"
        action={<Link to="/#thu-mua" className="btn-ink">Bán sách cũ ngay</Link>}
      >
        Bạn có sách cũ không dùng đến? BookWise thu mua với giá lên đến 45% giá bìa, nhận sách tận nhà và chuyển khoản nhanh.
      </EmptyState>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <p className="text-sm text-ink-soft">Có <strong>{mine.length}</strong> yêu cầu bán lại sách</p>
        <Link to="/#thu-mua" className="btn-ghost btn-sm">Tạo yêu cầu mới</Link>
      </div>
      <ul className="divide-y divide-rule border-y border-rule">
        {mine.map((b) => (
          <li key={b.code} className="py-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium text-sm">{b.code}</span>
                <span className="tag text-xs font-semibold">{BUYBACK_STATUS_LABEL[b.status]}</span>
              </div>
              <span className="font-semibold text-forest num text-sm">
                Ước tính: {formatMoney(b.estimatedPrice)}
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium text-ink">{b.bookTitle}</p>
                <p className="text-xs text-ink-mute">{b.author} · {b.condition === 'likenew' ? 'Như mới (98%)' : 'Đã sử dụng (90%)'}</p>
              </div>
              <div className="text-xs text-ink-soft">
                <p>Nhận tiền qua: <strong>{b.bankName}</strong> · {b.bankAccount} ({b.accountHolder})</p>
                <p className="mt-0.5 text-ink-mute">Địa chỉ lấy: {b.address}</p>
              </div>
            </div>

            <div className="mt-3 border-t border-rule-soft pt-3">
              <p className="eyebrow text-2xs">Tiến trình xử lý:</p>
              <ul className="mt-1.5 space-y-1 text-xs">
                {b.history.map((h, i) => (
                  <li key={i} className="flex gap-2 text-ink-soft">
                    <span className="text-ink-mute num shrink-0">{formatDateTime(h.at)}</span>
                    <span>— {h.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChangePasswordForm() {
  const { changePassword } = useAuth()
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!oldPass) return setError('Vui lòng nhập mật khẩu hiện tại')
    if (newPass.length < 6) return setError('Mật khẩu mới cần ít nhất 6 ký tự')
    if (newPass !== confirmPass) return setError('Mật khẩu xác nhận không khớp')

    const r = changePassword(oldPass, newPass)
    if (!r.ok) return setError(r.error)
    setError('')
    setOldPass('')
    setNewPass('')
    setConfirmPass('')
    notify('Đã đổi mật khẩu thành công!')
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
      <p className="eyebrow border-b border-rule pb-2">Thay đổi mật khẩu đăng nhập</p>
      <TextField label="Mật khẩu hiện tại" type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
      <TextField label="Mật khẩu mới" type="password" hint="Ít nhất 6 ký tự" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
      <TextField label="Xác nhận mật khẩu mới" type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
      {error && <p className="text-sm text-terra">{error}</p>}
      <button type="submit" className="btn-ink">Cập nhật mật khẩu</button>
    </form>
  )
}
