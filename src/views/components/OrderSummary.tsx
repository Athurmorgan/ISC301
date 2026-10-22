import { useState, type FormEvent, type ReactNode } from 'react'
import { COUPONS } from '../../data/catalog'
import { formatMoney } from '../../models/format'
import type { Result, Totals } from '../../models/types'
import { Icon } from './Icon'

interface Props {
  totals: Totals
  codes: string[]
  onApply: (code: string) => Result<string[]>
  onRemove: (code: string) => void
  shippingLabel?: string
  children?: ReactNode
}

/** Khối tổng tiền + mã giảm giá dùng chung cho Giỏ hàng và Thanh toán */
export function OrderSummary({ totals, codes, onApply, onRemove, shippingLabel = 'Phí giao hàng', children }: Props) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const savings = totals.listTotal - totals.subtotal + totals.discount + totals.shippingDiscount
  const pending = codes.filter((c) => !totals.appliedCoupons.some((a) => a.code === c))

  function apply(e: FormEvent) {
    e.preventDefault()
    const r = onApply(code)
    if (r.ok) {
      setCode('')
      setError('')
    } else setError(r.error)
  }

  return (
    <div className="border border-ink bg-card">
      <div className="p-5 sm:p-6">
        <p className="eyebrow">Tóm tắt đơn hàng</p>

        <form onSubmit={apply} className="mt-4" noValidate>
          <label htmlFor="coupon" className="label">
            Mã giảm giá
          </label>
          <div className="flex">
            <input
              id="coupon"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="field font-mono uppercase"
              placeholder="BOOKWISE50K"
              aria-invalid={!!error}
              autoComplete="off"
            />
            <button type="submit" className="btn-ink shrink-0 px-4">
              Áp dụng
            </button>
          </div>
          {error && <p className="mt-1.5 text-xs text-terra">{error}</p>}
          <details className="mt-2 text-xs text-ink-mute">
            <summary className="cursor-pointer select-none hover:text-ink">Mã đang có hiệu lực</summary>
            <ul className="mt-2 space-y-1.5">
              {COUPONS.map((c) => (
                <li key={c.code}>
                  <button type="button" onClick={() => setCode(c.code)} className="text-left hover:text-ink">
                    <span className="font-mono font-medium text-ink">{c.code}</span> — {c.description}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </form>

        {(totals.appliedCoupons.length > 0 || pending.length > 0) && (
          <ul className="mt-4 space-y-2">
            {totals.appliedCoupons.map((c) => (
              <CouponChip key={c.code} code={c.code} note={c.description} onRemove={onRemove} />
            ))}
            {pending.map((c) => (
              <CouponChip key={c} code={c} note="Chưa đủ điều kiện với giỏ hiện tại" muted onRemove={onRemove} />
            ))}
          </ul>
        )}

        <dl className="mt-6 space-y-2.5 border-t border-rule pt-5 text-sm">
          <Row label={`Tạm tính (${totals.itemCount} cuốn)`} value={formatMoney(totals.subtotal)} />
          {totals.discount > 0 && <Row label="Giảm giá" value={`−${formatMoney(totals.discount)}`} accent />}
          <Row label={shippingLabel} value={formatMoney(totals.shippingFee)} />
          {totals.shippingDiscount > 0 && <Row label="Giảm phí giao" value={`−${formatMoney(totals.shippingDiscount)}`} accent />}
        </dl>
        <div className="mt-5 flex items-baseline justify-between border-t border-ink pt-4">
          <span className="font-semibold">Tổng cộng</span>
          <span className="font-display text-[1.75rem] font-semibold num">{formatMoney(totals.total)}</span>
        </div>
        {savings > 0 && <p className="mt-1 text-right text-xs text-forest num">Bạn tiết kiệm {formatMoney(savings)} so với giá bìa</p>}
      </div>
      {children && <div className="border-t border-rule p-5 sm:p-6">{children}</div>}
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={`num ${accent ? 'text-forest' : ''}`}>{value}</dd>
    </div>
  )
}

function CouponChip({ code, note, muted, onRemove }: { code: string; note: string; muted?: boolean; onRemove: (c: string) => void }) {
  return (
    <li className={`flex items-center gap-3 border border-dashed px-3 py-2 ${muted ? 'border-rule text-ink-mute' : 'border-forest bg-forest-tint text-forest'}`}>
      <Icon name={muted ? 'clock' : 'check'} size={16} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-xs font-semibold">{code}</span>
        <span className="block truncate text-2xs">{note}</span>
      </span>
      <button type="button" onClick={() => onRemove(code)} className="shrink-0 opacity-70 hover:opacity-100" aria-label={`Bỏ mã ${code}`}>
        <Icon name="close" size={14} />
      </button>
    </li>
  )
}
