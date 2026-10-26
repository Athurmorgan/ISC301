import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { CONDITIONS, PAYMENTS, PROVINCES, SHIPPING } from '../../data/catalog'
import { useAuth } from '../../controllers/useAuth'
import { useCart } from '../../controllers/useCart'
import { formatMoney } from '../../models/format'
import type { Address, PaymentId, ShippingId } from '../../models/types'
import { hasErrors, validateAddress, type Errors } from '../../models/validation'
import { placeOrderOnline } from '../../services/orderService'
import { notifyError } from '../../services/toastService'
import { Icon, type IconName } from '../components/Icon'
import { OrderSummary } from '../components/OrderSummary'
import { PaymentModal } from '../components/PaymentModal'
import { SelectField, TextArea, TextField } from '../components/ui'

const PAYMENT_ICON: Record<PaymentId, IconName> = { vietqr: 'qr', ewallet: 'wallet', card: 'card', cod: 'cash' }

export function CheckoutPage() {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()
  // Chỉ tự điền từ tài khoản khách hàng, không dùng thông tin của quản trị viên
  const customer = user?.role === 'customer' ? user : null
  const saved = customer?.address ?? {}
  const [address, setAddress] = useState<Address>({
    name: saved.name ?? customer?.name ?? '',
    phone: saved.phone ?? customer?.phone ?? '',
    email: saved.email ?? customer?.email ?? '',
    province: saved.province ?? '',
    district: saved.district ?? '',
    street: saved.street ?? '',
  })
  const [errors, setErrors] = useState<Errors<Address>>({})
  const [chosenShipping, setShipping] = useState<ShippingId>('standard')
  const [paymentId, setPayment] = useState<PaymentId>('vietqr')
  const [note, setNote] = useState('')
  const [paying, setPaying] = useState(false)

  const express = SHIPPING.find((s) => s.id === 'express')!
  const expressAllowed = !address.province || express.provinces!.includes(address.province)
  const shippingId: ShippingId = chosenShipping === 'express' && !expressAllowed ? 'standard' : chosenShipping
  const { totals, codes, applyCoupon, removeCoupon } = useCart(shippingId)

  useEffect(() => {
    document.title = 'Thanh toán — BookWise'
  }, [])

  if (!totals.lines.length && !paying) return <Navigate to="/gio-hang" replace />

  const set = <K extends keyof Address>(key: K, value: Address[K]) => {
    setAddress((a) => ({ ...a, [key]: value, ...(key === 'province' ? { district: '' } : {}) }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const found = validateAddress(address)
    setErrors(found)
    if (hasErrors(found)) {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    if (paymentId === 'cod') complete()
    else setPaying(true)
  }

  async function complete() {
    const r = await placeOrderOnline({ customer: address, shippingId, paymentId, note, userEmail: user?.role === 'customer' ? user.email : null })
    if (!r.ok) {
      setPaying(false)
      return notifyError(r.error)
    }
    if (user?.role === 'customer') updateProfile({ name: user.name, phone: user.phone, address })
    navigate(`/don-hang?code=${r.value.code}&moi=1`, { replace: true })
  }

  return (
    <div className="container-page pt-10 sm:pt-14">
      <header className="border-b border-ink pb-6">
        <Link to="/gio-hang" className="inline-flex items-center gap-1.5 text-xs text-ink-mute hover:text-ink">
          <Icon name="arrowLeft" size={14} />
          Quay lại giỏ hàng
        </Link>
        <h1 className="mt-3 text-4xl sm:text-5xl">Thanh toán</h1>
      </header>

      {/* Form mã giảm giá nằm trong cột tóm tắt, nên form đặt hàng chỉ bọc cột trái; nút gửi liên kết qua thuộc tính form */}
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
        <form id="checkout-form" onSubmit={submit} noValidate className="space-y-12">
          <Step index="1" title="Địa chỉ nhận sách" aside={!user && <Link to="/tai-khoan" className="link text-xs text-ink-soft">Đăng nhập để điền nhanh</Link>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Họ và tên" autoComplete="name" value={address.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
              <TextField label="Số điện thoại" type="tel" autoComplete="tel" inputMode="tel" value={address.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
              <TextField
                className="sm:col-span-2"
                label="Email (không bắt buộc)"
                type="email"
                autoComplete="email"
                value={address.email}
                onChange={(e) => set('email', e.target.value)}
                error={errors.email}
                hint="Để nhận hoá đơn điện tử và thông báo trạng thái đơn"
              />
              <SelectField label="Tỉnh / thành phố" value={address.province} onChange={(e) => set('province', e.target.value)} error={errors.province}>
                <option value="">Chọn tỉnh/thành</option>
                {Object.keys(PROVINCES).map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </SelectField>
              <SelectField label="Quận / huyện" value={address.district} onChange={(e) => set('district', e.target.value)} error={errors.district} disabled={!address.province}>
                <option value="">Chọn quận/huyện</option>
                {(PROVINCES[address.province] ?? []).map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </SelectField>
              <TextField className="sm:col-span-2" label="Số nhà, tên đường" autoComplete="street-address" value={address.street} onChange={(e) => set('street', e.target.value)} error={errors.street} />
            </div>
          </Step>

          <Step index="2" title="Hình thức giao hàng">
            <div className="grid gap-3 sm:grid-cols-2">
              {SHIPPING.map((s) => {
                const disabled = s.id === 'express' && !expressAllowed
                return (
                  <Choice key={s.id} name="shipping" checked={shippingId === s.id} disabled={disabled} onChange={() => setShipping(s.id)}>
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-sm num">{formatMoney(s.fee)}</span>
                    </span>
                    <span className="mt-1 block text-xs text-ink-soft">{s.eta}</span>
                    <span className="mt-0.5 block text-xs text-ink-mute">
                      {disabled ? `Chỉ áp dụng tại ${s.provinces!.join(' và ')}` : s.carrier}
                    </span>
                  </Choice>
                )
              })}
            </div>
          </Step>

          <Step index="3" title="Phương thức thanh toán">
            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENTS.map((p) => (
                <Choice key={p.id} name="payment" checked={paymentId === p.id} onChange={() => setPayment(p.id)}>
                  <span className="flex items-center gap-3">
                    <Icon name={PAYMENT_ICON[p.id]} size={22} className="shrink-0 text-forest" />
                    <span>
                      <span className="block font-semibold">{p.name}</span>
                      <span className="block text-xs text-ink-mute">{p.detail}</span>
                    </span>
                  </span>
                </Choice>
              ))}
            </div>
          </Step>

          <Step index="4" title="Ghi chú">
            <TextArea label="Lời nhắn cho BookWise (không bắt buộc)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: gói quà, giao giờ hành chính…" rows={3} />
          </Step>
        </form>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <ul className="mb-4 max-h-64 divide-y divide-rule-soft overflow-y-auto border border-rule bg-card px-4">
            {totals.lines.map((l) => (
              <li key={`${l.bookId}-${l.condition}`} className="flex items-center gap-3 py-3">
                <span className="relative shrink-0">
                  <img src={l.book.cover} alt="" className="h-14 w-[2.33rem] bg-paper-deep object-cover" />
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center bg-ink px-1 text-2xs text-paper num">{l.qty}</span>
                </span>
                <span className="min-w-0 flex-1 pl-1">
                  <span className="block truncate text-sm font-medium">{l.book.title}</span>
                  <span className="block text-2xs text-ink-mute">{CONDITIONS[l.condition].label}</span>
                </span>
                <span className="text-sm num">{formatMoney(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <OrderSummary totals={totals} codes={codes} onApply={applyCoupon} onRemove={removeCoupon}>
            <button type="submit" form="checkout-form" className="btn-primary w-full">
              {paymentId === 'cod' ? 'Đặt hàng' : `Thanh toán ${formatMoney(totals.total)}`}
            </button>
            <p className="mt-3 text-center text-2xs leading-relaxed text-ink-mute">
              Bằng việc đặt hàng, bạn đồng ý với chính sách đổi trả 7 ngày của BookWise. Đây là bản demo, không phát sinh giao dịch thật.
            </p>
          </OrderSummary>
        </aside>
      </div>

      <PaymentModal
        open={paying}
        method={paymentId}
        amount={totals.total}
        reference={address.phone.replace(/\D/g, '')}
        onClose={() => setPaying(false)}
        onPaid={complete}
      />
    </div>
  )
}

function Step({ index, title, aside, children }: { index: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-rule pb-3">
        <h2 className="flex items-baseline gap-3 text-2xl">
          <span className="font-mono text-sm text-ink-mute">{index.padStart(2, '0')}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Choice({ name, checked, disabled, onChange, children }: { name: string; checked: boolean; disabled?: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label
      className={`relative block border p-4 transition-colors ${
        disabled ? 'cursor-not-allowed border-rule-soft opacity-50' : checked ? 'cursor-pointer border-ink bg-card shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'cursor-pointer border-rule hover:border-ink-mute'
      }`}
    >
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} className="sr-only" />
      {children}
    </label>
  )
}
