import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAllOrders, useOrder, useRemoteOrder } from '../../controllers/useOrders'
import { formatDate, formatMoney } from '../../models/format'
import { itemCount } from '../../models/order'
import { isVietnamesePhone } from '../../models/validation'
import { Icon } from '../components/Icon'
import { OrderDetail } from '../components/OrderView'
import { EmptyState, StatusTag } from '../components/ui'

const digits = (s: string) => s.replace(/\D/g, '').replace(/^84/, '0')

export function TrackingPage() {
  const [params, setParams] = useSearchParams()
  const code = params.get('code')
  const phone = params.get('sdt')
  const justPlaced = params.get('moi') === '1'
  const localOrder = useOrder(code)
  const remote = useRemoteOrder(code, localOrder)
  const order = localOrder ?? remote.order
  const orders = useAllOrders()
  const [input, setInput] = useState(code ?? phone ?? '')

  const byPhone = useMemo(() => (phone ? orders.filter((o) => digits(o.customer.phone) === digits(phone)) : []), [orders, phone])

  useEffect(() => {
    document.title = 'Tra cứu đơn hàng — BookWise'
  }, [])

  function search(e: FormEvent) {
    e.preventDefault()
    const v = input.trim()
    if (!v) return
    setParams(isVietnamesePhone(v) ? { sdt: v } : { code: v.toUpperCase() })
  }

  return (
    <div className="container-page max-w-4xl pt-10 sm:pt-14">
      {justPlaced && order ? (
        <header className="border-b border-ink pb-8">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-forest">
            <Icon name="check" size={18} />
            Đặt hàng thành công
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Cảm ơn {order.customer.name.split(' ').pop()}, sách đang được chuẩn bị.</h1>
          <p className="mt-3 max-w-xl text-ink-soft">
            Lưu lại mã <span className="font-mono font-semibold text-ink">{order.code}</span> để tra cứu. Bạn cũng có thể tìm đơn bằng số điện thoại đã đặt.
          </p>
        </header>
      ) : (
        <header className="border-b border-ink pb-8">
          <p className="eyebrow">Tra cứu</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Đơn hàng của bạn đang ở đâu?</h1>
          <form onSubmit={search} className="mt-6 flex max-w-xl" role="search">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="field h-12 font-mono"
              placeholder="Mã đơn (BW-123456) hoặc số điện thoại"
              aria-label="Mã đơn hoặc số điện thoại"
            />
            <button type="submit" className="btn-ink h-12 shrink-0">
              Tra cứu
            </button>
          </form>
        </header>
      )}

      <div className="mt-10">
        {code &&
          (order ? (
            <OrderDetail order={order} verifyPhone={localOrder ? undefined : remote.verifyPhone} />
          ) : remote.loading ? (
            <p className="text-sm text-ink-mute">Đang tìm đơn trên hệ thống…</p>
          ) : (
            <EmptyState title={`Không tìm thấy đơn ${code}`}>Kiểm tra lại mã đơn, hoặc thử tìm bằng số điện thoại đặt hàng.</EmptyState>
          ))}

        {phone &&
          (byPhone.length ? (
            <>
              <p className="eyebrow mb-4">{byPhone.length} đơn với số {phone}</p>
              <ul className="divide-y divide-rule border-y border-rule">
                {byPhone.map((o) => (
                  <li key={o.code}>
                    <Link to={`/don-hang?code=${o.code}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-4 hover:bg-card sm:px-2">
                      <span className="font-mono font-medium">{o.code}</span>
                      <span className="text-sm text-ink-mute">{formatDate(o.createdAt)}</span>
                      <span className="text-sm text-ink-mute num">{itemCount(o)} cuốn</span>
                      <StatusTag status={o.status} />
                      <span className="ml-auto font-semibold num">{formatMoney(o.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState title="Chưa có đơn nào với số điện thoại này" />
          ))}

        {!code && !phone && <RecentOrders />}
      </div>

      {justPlaced && order && (
        <div className="no-print mt-8 flex flex-wrap gap-3">
          <Link to="/sach" className="btn-ink">
            Tiếp tục mua sách
          </Link>
          <Link to="/tai-khoan" className="btn-ghost">
            Xem tất cả đơn hàng
          </Link>
        </div>
      )}
    </div>
  )
}

/** Gợi ý các đơn đặt gần đây trên trình duyệt này để demo nhanh */
function RecentOrders() {
  const orders = useAllOrders()
  const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
  if (!recent.length) {
    return (
      <EmptyState title="Chưa có đơn hàng nào trên trình duyệt này" action={<Link to="/sach" className="btn-ink">Chọn sách</Link>}>
        Sau khi đặt hàng, mã đơn sẽ xuất hiện ở đây để bạn tra cứu nhanh.
      </EmptyState>
    )
  }
  return (
    <div>
      <p className="eyebrow mb-4">Đơn gần đây trên thiết bị này</p>
      <ul className="divide-y divide-rule border-y border-rule">
        {recent.map((o) => (
          <li key={o.code}>
            <Link to={`/don-hang?code=${o.code}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-4 hover:bg-card sm:px-2">
              <span className="font-mono font-medium">{o.code}</span>
              <span className="text-sm text-ink-mute">{o.customer.name}</span>
              <StatusTag status={o.status} />
              <span className="ml-auto font-semibold num">{formatMoney(o.total)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
