import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CONDITIONS, ORDER_FLOW, STATUS_HINT, STATUS_LABEL } from '../../data/catalog'
import { formatDateTime, formatMoney } from '../../models/format'
import { customerCanCancel, itemCount } from '../../models/order'
import type { Order } from '../../models/types'
import { useOrderActions } from '../../controllers/useOrders'
import { ConfirmButton, StatusTag } from './ui'
import { useAuth } from '../../controllers/useAuth'

/** Dòng thời gian 4 bước; đơn huỷ hiển thị điểm dừng màu đất nung */
export function StatusTimeline({ order }: { order: Order }) {
  const cancelled = order.status === 'cancelled'
  const reached = (s: (typeof ORDER_FLOW)[number]) => order.history.find((h) => h.status === s)
  const currentIndex = cancelled ? -1 : ORDER_FLOW.indexOf(order.status)
  const cancelEvent = order.history.find((h) => h.status === 'cancelled')

  return (
    <ol className="grid gap-0 sm:grid-cols-4">
      {ORDER_FLOW.map((s, i) => {
        const event = reached(s)
        const done = !!event
        const current = i === currentIndex
        return (
          <li key={s} className="relative flex gap-4 pb-6 sm:block sm:pb-0 sm:pr-4">
            {/* đường nối */}
            {i < ORDER_FLOW.length - 1 && (
              <span className={`absolute left-[7px] top-4 h-full w-px sm:left-4 sm:top-[7px] sm:h-px sm:w-full ${done && reached(ORDER_FLOW[i + 1]) ? 'bg-forest' : 'bg-rule'}`} />
            )}
            <span
              className={`relative z-10 mt-0.5 block h-[15px] w-[15px] shrink-0 rounded-full border-2 ${
                current ? 'border-forest bg-paper shadow-[0_0_0_4px_var(--color-forest-tint)]' : done ? 'border-forest bg-forest' : 'border-rule bg-paper'
              }`}
            />
            <div className="sm:mt-4">
              <p className={`text-sm font-semibold ${done ? 'text-ink' : 'text-ink-mute'}`}>{STATUS_LABEL[s]}</p>
              <p className="mt-0.5 text-xs text-ink-mute num">{event ? formatDateTime(event.at) : '—'}</p>
              {current && <p className="mt-1.5 max-w-[14rem] text-xs leading-relaxed text-ink-soft">{event?.note || STATUS_HINT[s]}</p>}
            </div>
          </li>
        )
      })}
      {cancelled && cancelEvent && (
        <li className="mt-2 border-l-2 border-terra bg-terra-tint px-4 py-3 text-sm sm:col-span-4 sm:mt-6">
          <span className="font-semibold text-terra">Đơn đã huỷ</span>
          <span className="text-ink-soft"> · {formatDateTime(cancelEvent.at)} · {cancelEvent.note}</span>
        </li>
      )}
    </ol>
  )
}

const maskPhone = (p: string) => {
  const clean = p.replace(/\D/g, '')
  if (clean.length < 6) return '***'
  return clean.slice(0, 3) + '****' + clean.slice(-3)
}

const maskName = (name: string) => {
  const parts = name.trim().split(' ')
  return parts.map((w, i) => (i === 0 ? w : w[0] + '**')).join(' ')
}

const maskStreet = (street: string) => {
  return street.length > 5 ? '***' + street.slice(-5) : '***'
}

/** Chi tiết đơn: sách, địa chỉ, thanh toán và các thao tác của khách */
export function OrderDetail({ order }: { order: Order }) {
  const { cancelByCustomer, reorder } = useOrderActions()
  const { user } = useAuth()
  const [armed, setArmed] = useState(false)
  const [verifyPhoneInput, setVerifyPhoneInput] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  const isOwner = user?.role === 'admin' || (user?.email && user.email === order.userEmail) || unlocked

  function handleVerifyPhone(e: React.FormEvent) {
    e.preventDefault()
    const cleanInput = verifyPhoneInput.replace(/\D/g, '')
    const cleanPhone = order.customer.phone.replace(/\D/g, '')
    if (cleanPhone.endsWith(cleanInput) && cleanInput.length >= 4) {
      setUnlocked(true)
      setVerifyError('')
    } else {
      setVerifyError('4 số cuối điện thoại không khớp với đơn hàng')
    }
  }

  return (
    <article className="border border-ink bg-card">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-rule p-5 sm:p-6">
        <div>
          <p className="eyebrow">Mã đơn hàng</p>
          <p className="mt-1 font-mono text-2xl font-medium">{order.code}</p>
          <p className="mt-1 text-xs text-ink-mute">Đặt lúc {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusTag status={order.status} />
      </header>

      <div className="border-b border-rule p-5 sm:p-6">
        <StatusTimeline order={order} />
      </div>

      <div className="grid md:grid-cols-[1.4fr_1fr]">
        <div className="border-b border-rule p-5 sm:p-6 md:border-b-0 md:border-r">
          <p className="eyebrow mb-3">{itemCount(order)} cuốn sách</p>
          <ul className="divide-y divide-rule-soft">
            {order.items.map((i) => (
              <li key={`${i.bookId}-${i.condition}`} className="flex items-center gap-3 py-3">
                <Link to={`/sach/${i.bookId}`} className="shrink-0">
                  <img src={i.cover} alt="" className="h-16 w-[2.66rem] bg-paper-deep object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/sach/${i.bookId}`} className="block truncate font-medium hover:underline underline-offset-4">
                    {i.title}
                  </Link>
                  <p className="text-xs text-ink-mute">
                    {CONDITIONS[i.condition].label} · {i.qty} × {formatMoney(i.unitPrice)}
                  </p>
                </div>
                <p className="text-sm font-semibold num">{formatMoney(i.qty * i.unitPrice)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-rule pt-4 text-sm">
            <Line k="Tạm tính" v={formatMoney(order.subtotal)} />
            {order.discount > 0 && <Line k={`Giảm giá (${order.coupons.filter((c) => c !== 'FREESHIP15K').join(', ')})`} v={`−${formatMoney(order.discount)}`} />}
            <Line k={order.shipping.name} v={formatMoney(order.shipping.fee)} />
            {order.shippingDiscount > 0 && <Line k="Giảm phí giao" v={`−${formatMoney(order.shippingDiscount)}`} />}
            <div className="flex justify-between border-t border-ink pt-3 text-base font-semibold">
              <dt>Tổng cộng</dt>
              <dd className="num">{formatMoney(order.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6 p-5 text-sm sm:p-6">
          <div>
            <p className="eyebrow mb-2">Giao đến</p>
            <p className="font-semibold">{isOwner ? order.customer.name : maskName(order.customer.name)}</p>
            <p className="text-ink-soft">{isOwner ? order.customer.phone : maskPhone(order.customer.phone)}</p>
            <p className="mt-1 text-ink-soft">
              {isOwner ? order.customer.street : maskStreet(order.customer.street)}, {order.customer.district}, {order.customer.province}
            </p>
            {!isOwner && (
              <form onSubmit={handleVerifyPhone} className="mt-3 border border-rule bg-paper p-3 text-xs">
                <p className="font-semibold text-ink">Bảo mật thông tin người nhận</p>
                <p className="mt-1 text-ink-mute">Nhập 4 số cuối số điện thoại đặt hàng để mở khoá địa chỉ đầy đủ:</p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="password"
                    maxLength={4}
                    value={verifyPhoneInput}
                    onChange={(e) => setVerifyPhoneInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="VD: 5678"
                    className="field h-8 w-24 text-center font-mono py-0 text-sm"
                  />
                  <button type="submit" className="btn-ink btn-sm">Mở khoá</button>
                </div>
                {verifyError && <p className="mt-1.5 text-terra">{verifyError}</p>}
              </form>
            )}
          </div>
          <div>
            <p className="eyebrow mb-2">Thanh toán</p>
            <p>{order.payment.name}</p>
            <p className={`text-xs font-semibold ${order.payment.paid ? 'text-forest' : 'text-ink-mute'}`}>
              {order.payment.paid ? 'Đã thanh toán' : 'Thanh toán khi nhận hàng'}
            </p>
          </div>
          {order.note && (
            <div>
              <p className="eyebrow mb-2">Ghi chú</p>
              <p className="text-ink-soft">{isOwner ? order.note : '*** (Đã ẩn vì lý do riêng tư)'}</p>
            </div>
          )}
        </div>
      </div>

      <footer className="no-print flex flex-wrap gap-2 border-t border-rule p-5 sm:p-6">
        {customerCanCancel(order) && (
          <ConfirmButton armed={armed} onArm={() => setArmed(true)} onConfirm={() => cancelByCustomer(order)} armedLabel="Bấm lần nữa để huỷ đơn">
            Huỷ đơn
          </ConfirmButton>
        )}
        <button type="button" onClick={() => reorder(order)} className="btn-ghost btn-sm">
          Mua lại
        </button>
        <Link to={`/ho-tro?order=${order.code}`} className="btn-ghost btn-sm">
          Cần hỗ trợ
        </Link>
        <button type="button" onClick={() => window.print()} className="btn-ghost btn-sm ml-auto">
          In hoá đơn
        </button>
      </footer>
    </article>
  )
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{k}</dt>
      <dd className="num">{v}</dd>
    </div>
  )
}
