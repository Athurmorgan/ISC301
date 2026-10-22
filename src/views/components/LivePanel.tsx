import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLiveTraffic, useOpenTabs, useOrderPulse } from '../../controllers/useLive'
import { formatMoney, formatNumber } from '../../models/format'
import { TICK_MS, timeAgo, type LiveEventKind, type Share } from '../../models/live'
import { notify } from '../../services/toastService'
import { StatusTag } from './ui'

const KIND_LABEL: Record<LiveEventKind, string> = {
  view: 'Xem',
  cart: 'Giỏ hàng',
  search: 'Tìm kiếm',
  checkout: 'Thanh toán',
  review: 'Đánh giá',
  signup: 'Đăng ký',
}
const KIND_TONE: Record<LiveEventKind, string> = {
  view: 'text-ink-mute',
  cart: 'text-forest',
  search: 'text-ink-soft',
  checkout: 'text-terra',
  review: 'text-ink-soft',
  signup: 'text-forest',
}

const ROLE_LABEL = { guest: 'Khách', customer: 'Thành viên', admin: 'Quản trị' } as const

export function LivePanel() {
  const live = useLiveTraffic()
  const tabs = useOpenTabs()
  const pulse = useOrderPulse(live.at)
  const online = live.visitors + tabs.length
  const twoMinAgo = live.history[Math.max(0, live.history.length - 40)]
  const delta = live.visitors - twoMinAgo
  const peak = Math.max(...live.history)

  useNewOrderAlert(pulse.latest.map((o) => ({ code: o.code, total: o.total })))

  const funnel = [
    { label: 'Đang online', value: online },
    { label: 'Đang xem sách', value: live.browsing },
    { label: 'Có sách trong giỏ', value: live.carts },
    { label: 'Đang thanh toán', value: live.checkout },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <p className="flex items-center gap-2.5 font-mono uppercase tracking-[0.14em]">
          <LiveDot />
          Trực tiếp
          <span className="text-ink-mute">· {new Date(live.at).toLocaleTimeString('vi-VN')} · làm mới mỗi {TICK_MS / 1000} giây</span>
        </p>
        <p className="text-ink-mute">
          <Source kind="real" /> đơn hàng thật trong hệ thống &nbsp; <Source kind="sim" /> lưu lượng mô phỏng (chưa có máy chủ)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_2fr]">
        {/* Người online */}
        <section className="flex flex-col bg-ink p-6 text-paper">
          <div className="flex items-start justify-between gap-4">
            <p className="eyebrow text-paper/60">Người đang online</p>
            <Source kind="sim" light />
          </div>
          <p className="mt-3 flex items-baseline gap-3">
            <span className="font-display text-6xl leading-none num">{formatNumber(online)}</span>
            <span className={`text-sm num ${delta >= 0 ? 'text-[#9fd3b4]' : 'text-[#f0a988]'}`}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} so với 2 phút trước
            </span>
          </p>
          <Spark values={live.history} peak={peak} />
          <div className="mt-2 flex justify-between font-mono text-[10px] text-paper/50">
            <span>2 phút trước</span>
            <span>đỉnh {peak}</span>
            <span>bây giờ</span>
          </div>
          <p className="mt-5 border-t border-paper/15 pt-4 text-xs text-paper/70">
            Gồm <span className="font-semibold text-paper">{tabs.length}</span> tab BookWise thật đang mở trên trình duyệt này
          </p>
        </section>

        {/* Chỉ số */}
        <dl className="grid grid-cols-2 border border-ink sm:grid-cols-3">
          <Metric label="Phiên hôm nay" value={formatNumber(live.sessionsToday)} kind="sim" />
          <Metric label="Lượt xem trang" value={formatNumber(live.pageviewsToday)} kind="sim" />
          <Metric label="Giỏ hàng đang mở" value={formatNumber(live.carts)} kind="sim" />
          <Metric label="Đơn hôm nay" value={formatNumber(pulse.todayCount)} note={`${pulse.lastHourCount} đơn trong 1 giờ qua`} kind="real" />
          <Metric label="Doanh thu hôm nay" value={formatMoney(pulse.todayRevenue)} note={`${pulse.todayBooks} cuốn đã bán`} kind="real" />
          <Metric label="Giá trị đơn TB" value={pulse.averageOrder ? formatMoney(pulse.averageOrder) : '—'} note={`${pulse.pending} đơn chờ xác nhận`} kind="real" />
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Hành trình mua hàng lúc này" kind="sim">
          <ul className="space-y-3.5">
            {funnel.map((f, i) => (
              <li key={f.label}>
                <div className="flex justify-between text-sm">
                  <span>{f.label}</span>
                  <span className="num">
                    <span className="font-semibold">{formatNumber(f.value)}</span>
                    {i > 0 && <span className="ml-2 text-xs text-ink-mute">{Math.round((f.value / online) * 100)}%</span>}
                  </span>
                </div>
                <Bar ratio={f.value / online} tone={i === funnel.length - 1 ? 'terra' : 'forest'} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Đơn đặt theo giờ hôm nay" kind="real">
          <HourChart byHour={pulse.byHour} hour={new Date(live.at).getHours()} />
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Trang đang được xem" kind="sim">
          <ShareList items={live.pages.slice(0, 7)} total={live.visitors} link />
        </Card>
        <Card title="Nguồn truy cập" kind="sim">
          <ShareList items={live.sources} total={live.visitors} />
        </Card>
        <Card title="Khu vực & thiết bị" kind="sim">
          <ShareList items={live.regions} total={live.visitors} />
          <div className="mt-5 flex h-2 overflow-hidden">
            {live.devices.map((d, i) => (
              <span key={d.label} className={['bg-ink', 'bg-forest', 'bg-terra'][i]} style={{ width: `${(d.count / live.visitors) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
            {live.devices.map((d, i) => (
              <li key={d.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 ${['bg-ink', 'bg-forest', 'bg-terra'][i]}`} />
                {d.label} <span className="num text-ink-mute">{Math.round((d.count / live.visitors) * 100)}%</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Hoạt động trực tiếp" kind="sim">
          <ol className="divide-y divide-rule-soft">
            {live.events.map((e) => (
              <li key={e.id} className="grid grid-cols-[5.5rem_1fr_auto] items-baseline gap-3 py-2.5 text-sm animate-fade">
                <span className={`font-mono text-[10px] uppercase tracking-[0.1em] ${KIND_TONE[e.kind]}`}>{KIND_LABEL[e.kind]}</span>
                <span className="min-w-0 truncate">
                  <span className="text-ink-mute">Khách ở {e.region}</span> {e.text}
                </span>
                <span className="whitespace-nowrap text-xs text-ink-mute">{timeAgo(e.at, live.at)}</span>
              </li>
            ))}
          </ol>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card title="Đơn mới nhất" kind="real">
            {pulse.latest.length ? (
              <ul className="divide-y divide-rule-soft">
                {pulse.latest.map((o) => {
                  const isNew = live.at - Date.parse(o.createdAt) < 120_000
                  return (
                    <li key={o.code} className="flex items-center gap-3 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2">
                          <span className="font-mono font-medium">{o.code}</span>
                          {isNew && <span className="bg-terra px-1.5 font-mono text-[10px] uppercase tracking-wider text-paper">Mới</span>}
                        </p>
                        <p className="truncate text-xs text-ink-mute">
                          {o.customer.name} · {o.customer.province} · {timeAgo(Date.parse(o.createdAt), live.at)}
                        </p>
                      </div>
                      <span className="font-semibold num">{formatMoney(o.total)}</span>
                      <StatusTag status={o.status} />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-mute">Chưa có đơn nào. Đặt thử một đơn ở tab khác, đơn sẽ hiện ở đây ngay lập tức.</p>
            )}
          </Card>

          <Card title="Tab đang mở trên trình duyệt này" kind="real">
            {tabs.length ? (
              <ul className="space-y-2 text-sm">
                {tabs.map((t) => (
                  <li key={t.id} className="flex items-center gap-2.5">
                    <LiveDot small />
                    <Link to={t.path} className="min-w-0 flex-1 truncate font-mono text-xs hover:underline underline-offset-4">
                      {t.path}
                    </Link>
                    <span className="text-xs text-ink-mute">{ROLE_LABEL[t.role]}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-mute">Mở BookWise ở một tab khác để thấy phiên thật xuất hiện tại đây.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

/** Báo toast khi có đơn mới xuất hiện (kể cả đơn đặt từ tab khác) */
function useNewOrderAlert(latest: { code: string; total: number }[]) {
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(latest.map((o) => o.code))
      return
    }
    for (const o of latest) {
      if (seen.current.has(o.code)) continue
      seen.current.add(o.code)
      notify(`Đơn mới ${o.code} · ${formatMoney(o.total)}`)
    }
  }, [latest])
}

function LiveDot({ small }: { small?: boolean }) {
  const size = small ? 'h-1.5 w-1.5' : 'h-2 w-2'
  return (
    <span className={`relative inline-flex ${size}`}>
      <span className={`absolute inset-0 rounded-full bg-terra animate-ping-soft`} />
      <span className={`relative inline-flex ${size} rounded-full bg-terra`} />
    </span>
  )
}

function Source({ kind, light }: { kind: 'real' | 'sim'; light?: boolean }) {
  const real = kind === 'real'
  return (
    <span
      className={`inline-block border px-1.5 font-mono text-[9px] uppercase leading-4 tracking-[0.12em] ${
        light ? 'border-paper/30 text-paper/60' : real ? 'border-forest text-forest' : 'border-rule text-ink-mute'
      }`}
    >
      {real ? 'Thật' : 'Mô phỏng'}
    </span>
  )
}

function Metric({ label, value, note, kind }: { label: string; value: string; note?: string; kind: 'real' | 'sim' }) {
  return (
    <div className="border-b border-r border-rule p-4 sm:p-5 [&:nth-child(n+5)]:border-b-0 sm:[&:nth-child(n+4)]:border-b-0 sm:[&:nth-child(3n)]:border-r-0 max-sm:[&:nth-child(2n)]:border-r-0">
      <dt className="eyebrow whitespace-nowrap">{label}</dt>
      <dd className="mt-3 whitespace-nowrap font-display text-[1.7rem] leading-none num">{value}</dd>
      <dd className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-mute">
        <Source kind={kind} />
        {note}
      </dd>
    </div>
  )
}

function Card({ title, kind, children }: { title: string; kind: 'real' | 'sim'; children: ReactNode }) {
  return (
    <section className="min-w-0 border border-rule bg-card p-5 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg">{title}</h3>
        <Source kind={kind} />
      </header>
      {children}
    </section>
  )
}

function Bar({ ratio, tone = 'forest' }: { ratio: number; tone?: 'forest' | 'terra' | 'ink' }) {
  const color = { forest: 'bg-forest', terra: 'bg-terra', ink: 'bg-ink' }[tone]
  return (
    <div className="mt-1.5 h-1.5 bg-paper-deep">
      <div className={`h-full ${color} transition-[width] duration-700 ease-out`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
    </div>
  )
}

function ShareList({ items, total, link }: { items: (Share & { to?: string })[]; total: number; link?: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map((s) => (
        <li key={s.label}>
          <div className="flex justify-between gap-3 text-sm">
            {link && s.to ? (
              <Link to={s.to} className="min-w-0 truncate hover:underline underline-offset-4">
                {s.label}
              </Link>
            ) : (
              <span className="min-w-0 truncate">{s.label}</span>
            )}
            <span className="font-semibold num">{s.count}</span>
          </div>
          <Bar ratio={total ? s.count / total : 0} tone="ink" />
        </li>
      ))}
    </ul>
  )
}

/** Trục đứng bắt đầu gần giá trị thấp nhất để thấy rõ dao động */
function Spark({ values, peak }: { values: number[]; peak: number }) {
  const floor = Math.min(...values) * 0.9
  const span = Math.max(1, peak - floor)
  return (
    <div className="mt-6 flex h-20 items-end gap-[3px]" aria-hidden="true">
      {values.map((v, i) => (
        <span
          key={i}
          className={`flex-1 transition-[height] duration-500 ${i === values.length - 1 ? 'bg-[#9fd3b4]' : 'bg-paper/25'}`}
          style={{ height: `${Math.max(6, ((v - floor) / span) * 100)}%` }}
        />
      ))}
    </div>
  )
}

function HourChart({ byHour, hour }: { byHour: number[]; hour: number }) {
  const max = Math.max(1, ...byHour)
  return (
    <div>
      <div className="flex h-36 items-end gap-1">
        {byHour.map((n, h) => (
          <div key={h} className="group relative flex h-full flex-1 items-end" title={`${h}h: ${n} đơn`}>
            <span
              className={`w-full ${h === hour ? 'bg-terra' : h < hour ? 'bg-forest' : 'bg-rule-soft'}`}
              style={{ height: n ? `${Math.max(6, (n / max) * 100)}%` : '2px' }}
            />
            {n > 0 && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] num text-ink-soft">{n}</span>}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-mute">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
    </div>
  )
}
