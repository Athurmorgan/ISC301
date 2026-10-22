import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BANK } from '../../data/catalog'
import { formatMoney } from '../../models/format'
import type { PaymentId } from '../../models/types'
import { DEMO_OTP, hasErrors, validateCard, type CardInput, type Errors } from '../../models/validation'
import { Icon } from './Icon'
import { Modal, TextField } from './ui'

interface Props {
  open: boolean
  method: PaymentId
  amount: number
  /** Nội dung chuyển khoản để đối soát */
  reference: string
  onClose: () => void
  onPaid: () => void
}

const TITLES: Record<PaymentId, string> = {
  vietqr: 'Chuyển khoản VietQR',
  ewallet: 'Thanh toán bằng ví',
  card: 'Thanh toán bằng thẻ',
  cod: 'Thanh toán khi nhận hàng',
}

/** Cổng thanh toán giả lập. Mỗi phương thức có luồng xác nhận riêng nhưng không gọi dịch vụ thật. */
export function PaymentModal({ open, method, amount, reference, onClose, onPaid }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={TITLES[method]} width="max-w-md">
      {/* key: mở lại modal thì bắt đầu lại từ đầu */}
      {open && method === 'vietqr' && <VietQr key="qr" amount={amount} reference={reference} onPaid={onPaid} />}
      {open && method === 'ewallet' && <Wallet key="wallet" amount={amount} onPaid={onPaid} />}
      {open && method === 'card' && <Card key="card" amount={amount} onPaid={onPaid} />}
    </Modal>
  )
}

/** Mô phỏng thời gian chờ cổng thanh toán phản hồi */
function useProcessing(onDone: () => void, ms = 1400) {
  const [busy, setBusy] = useState(false)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (!busy) return
    const t = window.setTimeout(() => done.current(), ms)
    return () => window.clearTimeout(t)
  }, [busy, ms])
  return [busy, () => setBusy(true)] as const
}

function VietQr({ amount, reference, onPaid }: { amount: number; reference: string; onPaid: () => void }) {
  const [busy, start] = useProcessing(onPaid)
  const info = `BOOKWISE ${reference}`
  const src = `https://img.vietqr.io/image/${BANK.bin}-${BANK.accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(info)}&accountName=${encodeURIComponent(BANK.accountName)}`

  return (
    <div>
      <div className="mx-auto w-56 border border-rule bg-white p-2">
        <img src={src} alt={`Mã VietQR chuyển ${formatMoney(amount)}`} className="aspect-square w-full object-contain" />
      </div>
      <dl className="mt-5 divide-y divide-rule-soft border-y border-rule-soft text-sm">
        {[
          ['Ngân hàng', BANK.bankName],
          ['Số tài khoản', BANK.accountNo],
          ['Chủ tài khoản', BANK.accountName],
          ['Số tiền', formatMoney(amount)],
          ['Nội dung', info],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="text-ink-mute">{k}</dt>
            <dd className="font-mono text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={start} disabled={busy} className="btn-primary mt-5 w-full">
        {busy ? 'Đang đối soát giao dịch…' : 'Tôi đã chuyển khoản'}
      </button>
      <p className="mt-2 text-center text-2xs text-ink-mute">Bản demo: không cần chuyển tiền thật, bấm nút để mô phỏng.</p>
    </div>
  )
}

function Wallet({ amount, onPaid }: { amount: number; onPaid: () => void }) {
  const [wallet, setWallet] = useState<'MoMo' | 'ZaloPay'>('MoMo')
  const [busy, start] = useProcessing(onPaid)
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {(['MoMo', 'ZaloPay'] as const).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWallet(w)}
            className={`h-14 border text-sm font-semibold ${wallet === w ? 'border-ink bg-card shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-rule'}`}
          >
            {w}
          </button>
        ))}
      </div>
      <div className="mt-5 bg-paper-deep px-5 py-6 text-center">
        <p className="text-sm text-ink-soft">Số tiền thanh toán</p>
        <p className="mt-1 font-display text-3xl num">{formatMoney(amount)}</p>
        <p className="mt-3 text-xs text-ink-mute">Ứng dụng {wallet} sẽ gửi yêu cầu xác nhận tới điện thoại của bạn.</p>
      </div>
      <button type="button" onClick={start} disabled={busy} className="btn-primary mt-5 w-full">
        {busy ? `Đang chờ ${wallet} xác nhận…` : `Mở ${wallet} và xác nhận`}
      </button>
    </div>
  )
}

const formatCardNumber = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')

const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

function Card({ amount, onPaid }: { amount: number; onPaid: () => void }) {
  const [card, setCard] = useState<CardInput>({ number: '', holder: '', expiry: '', cvv: '' })
  const [errors, setErrors] = useState<Errors<CardInput>>({})
  const [step, setStep] = useState<'card' | 'otp'>('card')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [busy, start] = useProcessing(onPaid, 900)

  const set = (k: keyof CardInput, v: string) => setCard((c) => ({ ...c, [k]: v }))

  function submitCard(e: FormEvent) {
    e.preventDefault()
    const found = validateCard(card)
    setErrors(found)
    if (!hasErrors(found)) setStep('otp')
  }

  function submitOtp(e: FormEvent) {
    e.preventDefault()
    if (otp !== DEMO_OTP) return setOtpError('Mã OTP không đúng')
    setOtpError('')
    start()
  }

  if (step === 'otp') {
    return (
      <form onSubmit={submitOtp} noValidate>
        <p className="text-sm text-ink-soft">
          Mã xác thực đã được gửi tới số điện thoại đăng ký thẻ đuôi <span className="font-mono">**{card.number.replace(/\D/g, '').slice(-4)}</span>.
        </p>
        <TextField
          className="mt-5"
          label="Mã OTP (demo: 123456)"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          error={otpError}
          autoFocus
        />
        <button type="submit" disabled={busy} className="btn-primary mt-5 w-full">
          {busy ? 'Đang xử lý…' : `Xác nhận thanh toán ${formatMoney(amount)}`}
        </button>
        <button type="button" onClick={() => setStep('card')} className="mt-3 w-full text-xs text-ink-mute underline underline-offset-4">
          Đổi thẻ khác
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={submitCard} noValidate className="space-y-4">
      <TextField
        label="Số thẻ"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="4111 1111 1111 1111"
        value={card.number}
        onChange={(e) => set('number', formatCardNumber(e.target.value))}
        error={errors.number}
        hint="Thẻ thử nghiệm: 4111 1111 1111 1111"
      />
      <TextField label="Tên in trên thẻ" autoComplete="cc-name" value={card.holder} onChange={(e) => set('holder', e.target.value.toUpperCase())} error={errors.holder} />
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Hết hạn" placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" value={card.expiry} onChange={(e) => set('expiry', formatExpiry(e.target.value))} error={errors.expiry} />
        <TextField label="CVV" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={card.cvv} onChange={(e) => set('cvv', e.target.value.replace(/\D/g, ''))} error={errors.cvv} />
      </div>
      <button type="submit" className="btn-primary w-full">
        Tiếp tục
      </button>
      <p className="flex items-center justify-center gap-1.5 text-2xs text-ink-mute">
        <Icon name="lock" size={12} />
        Thông tin thẻ không được lưu lại
      </p>
    </form>
  )
}
