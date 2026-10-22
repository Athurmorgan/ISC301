import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSalesReport } from '../../controllers/useReport'
import {
  BUYER_CRITERIA,
  COMPETITOR_HEADERS,
  COMPETITOR_MATRIX,
  DELIVERY_EXPECTATION,
  DELIVERY_FACTS,
  DELIVERY_OCCASION,
  MARKET_KPIS,
  METHODOLOGY,
  PAIN_TO_FEATURE,
  PAYMENT_PREFERENCE,
  PERSONAS,
  SELLER_BARRIERS,
  SELLER_WANTS,
  SLIDES,
  type Bar,
} from '../../data/research'
import { formatMoney, formatNumber } from '../../models/format'
import type { ReportRange } from '../../models/report'
import { Icon } from '../components/Icon'
import { Modal, SectionHeading } from '../components/ui'

const RANGES: { value: ReportRange; label: string }[] = [
  { value: 7, label: '7 ngày' },
  { value: 30, label: '30 ngày' },
  { value: 0, label: 'Tất cả' },
]

export function ReportPage() {
  const [slidesOpen, setSlidesOpen] = useState(false)

  useEffect(() => {
    document.title = 'Báo cáo nghiên cứu — BookWise'
  }, [])

  return (
    <div className="container-page pt-10 sm:pt-14">
      <header className="grid gap-8 border-b border-ink pb-10 lg:grid-cols-[1.5fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow">Báo cáo nghiên cứu · 2024</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-[1.08] sm:text-6xl">
            Sách thật, giá mềm, <em className="text-forest">đến nhanh</em> — và một vòng đời thứ hai cho mỗi cuốn.
          </h1>
        </div>
        <div className="no-print flex flex-wrap gap-2 lg:justify-end">
          <button type="button" onClick={() => setSlidesOpen(true)} className="btn-ink">
            Trình chiếu tóm tắt
          </button>
          <button type="button" onClick={() => window.print()} className="btn-outline">
            <Icon name="print" size={16} /> In / PDF
          </button>
        </div>
      </header>

      <dl className="grid border-b border-rule sm:grid-cols-3">
        {METHODOLOGY.map((m) => (
          <div key={m.label} className="border-rule py-6 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0">
            <dt className="text-sm text-ink-soft">{m.label}</dt>
            <dd className="mt-1 font-display text-3xl">{m.value}</dd>
            <dd className="text-xs text-ink-mute">{m.note}</dd>
          </div>
        ))}
      </dl>

      <LiveSales />

      <section className="mt-20">
        <SectionHeading index="02" title="Bức tranh thị trường" kicker="Quy mô và hành vi người đọc" />
        <div className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {MARKET_KPIS.map((k) => (
            <div key={k.label} className="bg-paper p-6">
              <p className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="font-display text-[2.6rem] leading-none">{k.value}</span>
                <span className="text-sm text-ink-mute">{k.unit}</span>
              </p>
              <p className="mt-4 font-medium">{k.label}</p>
              <p className="mt-1 text-sm text-ink-mute">{k.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <SectionHeading index="03" title="Kỳ vọng giao hàng" kicker="Người đọc muốn có sách ngay" />
        <div className="grid gap-10 lg:grid-cols-3">
          <Chart title="Thời gian nhận sách mong muốn" bars={DELIVERY_EXPECTATION} />
          <Chart title="Hoàn cảnh cần giao nhanh" bars={DELIVERY_OCCASION} />
          <div className="space-y-6">
            {DELIVERY_FACTS.map((f) => (
              <div key={f.label} className="border-l-2 border-forest pl-5">
                <p className="font-display text-4xl text-forest">{f.value}</p>
                <p className="mt-1 text-sm text-ink-soft">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-20">
        <SectionHeading index="04" title="Người mua & người bán" kicker="Hai đầu của vòng tuần hoàn" />
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <Chart title="Tiêu chí chọn nơi mua" bars={BUYER_CRITERIA} />
          <Chart title="Phương thức thanh toán ưa thích" bars={PAYMENT_PREFERENCE} />
          <Chart title="Rào cản khi bán sách cũ" bars={SELLER_BARRIERS} tone="terra" />
          <Chart title="Người bán mong muốn" bars={SELLER_WANTS} tone="terra" />
        </div>
      </section>

      <section className="mt-20">
        <SectionHeading index="05" title="Chân dung khách hàng" kicker="Ba nhóm khách hàng mục tiêu" />
        <div className="grid gap-6 lg:grid-cols-3">
          {PERSONAS.map((p) => (
            <article key={p.name} className="flex flex-col border border-ink bg-card">
              <div className="border-b border-rule p-6">
                <span className="tag">{p.archetype}</span>
                <h3 className="mt-4 text-2xl">{p.name}</h3>
                <p className="text-sm text-ink-mute">
                  {p.age} tuổi · {p.role} · {p.place}
                </p>
              </div>
              <blockquote className="flex-1 p-6 font-display text-xl italic leading-snug">“{p.quote}”</blockquote>
              <dl className="divide-y divide-rule-soft border-t border-rule text-sm">
                {p.facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-6 py-2.5">
                    <dt className="text-ink-mute">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <SectionHeading index="06" title="So sánh đối thủ" kicker="Lợi thế khác biệt" />
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink">
                <th className="w-40 py-3 pr-4 font-medium text-ink-mute">Tiêu chí</th>
                {COMPETITOR_HEADERS.map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-semibold ${i === 0 ? 'bg-forest text-paper' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPETITOR_MATRIX.map((row) => (
                <tr key={row.criterion} className="border-b border-rule align-top">
                  <th className="py-4 pr-4 font-medium">{row.criterion}</th>
                  {row.cells.map((c, i) => (
                    <td key={i} className={`px-4 py-4 ${i === 0 ? 'bg-forest-tint font-medium text-ink' : 'text-ink-soft'}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-20">
        <SectionHeading index="07" title="Từ nỗi đau đến tính năng" kicker="Mỗi tính năng trên web đều có lý do" />
        <ol className="border-t border-ink">
          {PAIN_TO_FEATURE.map((p, i) => (
            <li key={p.pain} className="grid gap-3 border-b border-rule py-6 md:grid-cols-[3rem_1fr_auto_1.3fr_auto] md:items-center md:gap-6">
              <span className="font-mono text-sm text-ink-mute">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="font-medium">{p.pain}</p>
                <p className="text-sm text-ink-mute">
                  <span className="num font-semibold text-terra">{p.stat}</span> người được hỏi
                </p>
              </div>
              <Icon name="arrowRight" size={18} className="hidden text-ink-mute md:block" />
              <div>
                <p className="font-medium">{p.feature}</p>
                <p className="text-sm text-forest">{p.impact}</p>
              </div>
              <Link to={p.link} className="link no-print text-sm">
                Xem trên web
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <SlideDeck open={slidesOpen} onClose={() => setSlidesOpen(false)} />
    </div>
  )
}

/** Số liệu bán hàng thật, tính từ các đơn trong trình duyệt (hoặc dữ liệu mẫu khi chưa có đơn). */
function LiveSales() {
  const [range, setRange] = useState<ReportRange>(30)
  const { report, downloadCsv, hasOrders } = useSalesReport(range)
  const maxCategory = Math.max(...report.byCategory.map((c) => c.revenue), 1)
  const maxBook = Math.max(...report.topBooks.map((b) => b.qty), 1)

  return (
    <section className="mt-16">
      <SectionHeading
        index="01"
        title="Bán hàng trên BookWise"
        kicker="Cập nhật trực tiếp từ đơn hàng"
        action={
          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="flex border border-ink" role="group" aria-label="Khoảng thời gian">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRange(r.value)}
                  aria-pressed={range === r.value}
                  className={`h-9 px-3 text-sm ${range === r.value ? 'bg-ink text-paper' : 'hover:bg-paper-deep'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={downloadCsv} className="btn-ghost btn-sm">
              <Icon name="download" size={15} /> CSV
            </button>
          </div>
        }
      />

      {report.source === 'sample' && (
        <p className="mb-6 border-l-2 border-terra bg-terra-tint px-4 py-3 text-sm text-ink-soft">
          {hasOrders ? 'Không có đơn nào trong khoảng này' : 'Chưa có đơn hàng nào'} — đang hiển thị số liệu mẫu.{' '}
          <Link to="/sach" className="link">
            Đặt thử một đơn
          </Link>{' '}
          để thấy báo cáo cập nhật.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-px border border-rule bg-rule lg:grid-cols-4">
        <Kpi label="Doanh thu" value={formatMoney(report.revenue)} />
        <Kpi label="Số đơn" value={formatNumber(report.orderCount)} />
        <Kpi label="Giá trị đơn trung bình" value={formatMoney(report.averageOrder)} />
        <Kpi label="Sách đã bán" value={`${formatNumber(report.booksSold)} cuốn`} />
      </dl>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-10">
          <Panel title="Doanh thu theo thể loại">
            <ul className="space-y-4">
              {report.byCategory.map((c) => (
                <li key={c.id}>
                  <div className="flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="num font-medium">{formatMoney(c.revenue)}</span>
                  </div>
                  <Meter ratio={c.revenue / maxCategory} />
                </li>
              ))}
            </ul>
          </Panel>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Chart title="Phương thức thanh toán" bars={report.byPayment.map((p) => ({ label: p.name, value: p.count }))} unit="đơn" />
            <Chart title="Tình trạng sách bán ra" bars={report.byCondition.map((c) => ({ label: c.label, value: c.qty }))} unit="cuốn" tone="terra" />
          </div>
        </div>

        <Panel title="Sách bán chạy">
          <ol className="divide-y divide-rule-soft">
            {report.topBooks.map((b, i) => (
              <li key={b.id} className="flex items-center gap-4 py-3">
                <span className="w-5 font-mono text-sm text-ink-mute">{i + 1}</span>
                <img src={b.cover} alt="" className="h-14 w-[2.33rem] shrink-0 bg-paper-deep object-cover" />
                <div className="min-w-0 flex-1">
                  <Link to={`/sach/${b.id}`} className="block truncate font-medium hover:underline underline-offset-4">
                    {b.title}
                  </Link>
                  <Meter ratio={b.qty / maxBook} />
                </div>
                <div className="text-right text-sm">
                  <p className="num font-semibold">{b.qty} cuốn</p>
                  <p className="num text-xs text-ink-mute">{formatMoney(b.revenue)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </section>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper p-5 sm:p-6">
      <dt className="text-sm text-ink-mute">{label}</dt>
      <dd className="mt-2 font-display text-2xl sm:text-3xl num">{value}</dd>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-4 border-b border-ink pb-2">{title}</p>
      {children}
    </div>
  )
}

function Meter({ ratio, tone = 'forest' }: { ratio: number; tone?: 'forest' | 'terra' }) {
  return (
    <div className="mt-1.5 h-1.5 bg-rule-soft">
      <div className={`h-full ${tone === 'forest' ? 'bg-forest' : 'bg-terra'}`} style={{ width: `${Math.max(2, ratio * 100)}%` }} />
    </div>
  )
}

/** Biểu đồ thanh ngang; mặc định giá trị là phần trăm */
function Chart({ title, bars, unit = '%', tone = 'forest' }: { title: string; bars: Bar[]; unit?: string; tone?: 'forest' | 'terra' }) {
  const max = Math.max(...bars.map((b) => b.value), 1)
  return (
    <Panel title={title}>
      <ul className="space-y-4">
        {bars.map((b) => (
          <li key={b.label}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-ink-soft">{b.label}</span>
              <span className="num whitespace-nowrap font-medium">
                {unit === '%' ? `${b.value.toLocaleString('vi-VN')}%` : `${formatNumber(b.value)} ${unit}`}
              </span>
            </div>
            <Meter ratio={b.value / max} tone={tone} />
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function SlideDeck({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0)
  const slide = SLIDES[i]

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, SLIDES.length - 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <Modal open={open} onClose={onClose} title={`${String(i + 1).padStart(2, '0')} / ${String(SLIDES.length).padStart(2, '0')}`} width="max-w-3xl">
      <div key={i} className="animate-fade">
        <p className="eyebrow text-forest">{slide.kicker}</p>
        <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">{slide.title}</h2>
        <ul className="mt-8 space-y-4">
          {slide.points.map((p) => (
            <li key={p} className="flex gap-4 border-t border-rule pt-4 text-lg">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-terra" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-10 flex items-center justify-between">
        <div className="flex gap-1.5">
          {SLIDES.map((s, n) => (
            <button key={s.kicker} type="button" onClick={() => setI(n)} aria-label={`Trang ${n + 1}`} className={`h-1 w-8 ${n === i ? 'bg-ink' : 'bg-rule'}`} />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setI(i - 1)} disabled={i === 0} className="btn-ghost btn-sm" aria-label="Trang trước">
            <Icon name="arrowLeft" size={16} />
          </button>
          <button type="button" onClick={() => setI(i + 1)} disabled={i === SLIDES.length - 1} className="btn-ink btn-sm" aria-label="Trang sau">
            <Icon name="arrowRight" size={16} />
          </button>
        </div>
      </div>
    </Modal>
  )
}
