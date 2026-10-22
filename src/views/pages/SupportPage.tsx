import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TICKET_TOPICS } from '../../data/catalog'
import { FAQS } from '../../data/faq'
import { useAuth } from '../../controllers/useAuth'
import { useBook } from '../../controllers/useBooks'
import { useTickets, validateTicket, type TicketErrors, type TicketInput } from '../../controllers/useFeedback'
import { formatMoney, normalize } from '../../models/format'
import { buybackQuote } from '../../models/pricing'
import type { Ticket, TicketTopic } from '../../models/types'
import { hasErrors } from '../../models/validation'
import { Icon } from '../components/Icon'
import { SelectField, TextArea, TextField } from '../components/ui'

export function SupportPage() {
  useEffect(() => {
    document.title = 'Hỗ trợ khách hàng — BookWise'
  }, [])

  return (
    <div className="container-page pt-10 sm:pt-14">
      <header className="grid gap-6 border-b border-ink pb-8 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <p className="eyebrow">Trung tâm hỗ trợ</p>
          <h1 className="mt-2 text-4xl leading-tight sm:text-5xl">Chúng tôi có thể giúp gì cho bạn?</h1>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-ink-mute">Hotline</dt>
            <dd className="font-mono font-medium">1900 6868</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-mute">Thời gian</dt>
            <dd>8:00 – 21:00 hằng ngày</dd>
          </div>
        </dl>
      </header>

      <div className="mt-10 grid gap-14 lg:grid-cols-[1fr_26rem]">
        <FaqList />
        <TicketForm />
      </div>
    </div>
  )
}

function FaqList() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(FAQS[0].q)
  const shown = useMemo(() => {
    const words = normalize(q).split(/\s+/).filter(Boolean)
    return FAQS.filter((f) => words.every((w) => normalize(`${f.q} ${f.a}`).includes(w)))
  }, [q])
  const groups = [...new Set(shown.map((f) => f.group))]

  return (
    <section>
      <h2 className="text-2xl">Câu hỏi thường gặp</h2>
      <label className="relative mt-5 block">
        <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input value={q} onChange={(e) => setQ(e.target.value)} className="field h-12 pl-10" placeholder="Tìm: đổi trả, hỏa tốc, VietQR…" aria-label="Tìm câu hỏi" />
      </label>

      {groups.length ? (
        groups.map((g) => (
          <div key={g} className="mt-8">
            <p className="eyebrow mb-2">{g}</p>
            <ul className="border-t border-ink">
              {shown
                .filter((f) => f.group === g)
                .map((f) => {
                  const isOpen = open === f.q || !!q
                  return (
                    <li key={f.q} className="border-b border-rule">
                      <button
                        type="button"
                        onClick={() => setOpen(open === f.q ? null : f.q)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-6 py-4 text-left font-medium hover:text-forest"
                      >
                        {f.q}
                        <Icon name={isOpen ? 'minus' : 'plus'} size={16} className="shrink-0" />
                      </button>
                      {isOpen && <p className="max-w-2xl pb-5 leading-relaxed text-ink-soft animate-fade">{f.a}</p>}
                    </li>
                  )
                })}
            </ul>
          </div>
        ))
      ) : (
        <p className="mt-8 text-ink-soft">Không có câu hỏi nào khớp “{q}”. Gửi yêu cầu bên cạnh, chúng tôi trả lời trong 24 giờ.</p>
      )}
    </section>
  )
}

function TicketForm() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const { create } = useTickets()
  const book = useBook(params.get('sach') ?? undefined)
  const initialTopic = (params.get('chu-de') as TicketTopic) in TICKET_TOPICS ? (params.get('chu-de') as TicketTopic) : 'order'

  const [form, setForm] = useState<TicketInput>(() => ({
    topic: initialTopic,
    name: user?.role === 'customer' ? user.name : '',
    email: user?.role === 'customer' ? user.email : '',
    phone: user?.role === 'customer' ? user.phone : '',
    orderCode: params.get('order') ?? '',
    message: book
      ? `Tôi muốn bán lại cuốn “${book.title}” (${book.author}). Giá ước tính: ${formatMoney(buybackQuote(book, 'likenew'))} nếu như mới, ${formatMoney(buybackQuote(book, 'used'))} nếu đã qua sử dụng. Thời gian lấy sách thuận tiện: `
      : '',
  }))
  const [errors, setErrors] = useState<TicketErrors>({})
  const [sent, setSent] = useState<Ticket | null>(null)

  const set = <K extends keyof TicketInput>(k: K, v: TicketInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const found = validateTicket(form)
    setErrors(found)
    if (!hasErrors(found)) setSent(create(form))
  }

  if (sent) {
    return (
      <aside className="self-start border border-ink bg-forest p-6 text-paper sm:p-8">
        <Icon name="check" size={28} />
        <p className="mt-4 font-display text-2xl">Đã nhận yêu cầu</p>
        <p className="mt-2 text-sm text-paper/80">
          Mã phiếu <span className="font-mono font-semibold text-paper">{sent.code}</span>. Chúng tôi sẽ phản hồi qua {sent.email} trong vòng 24 giờ.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => setSent(null)} className="btn border border-paper/40 text-paper hover:border-paper">
            Gửi yêu cầu khác
          </button>
          {user && (
            <Link to="/tai-khoan" className="btn text-paper underline underline-offset-4">
              Xem trong tài khoản
            </Link>
          )}
        </div>
      </aside>
    )
  }

  return (
    <aside className="self-start border border-ink bg-card">
      <form onSubmit={submit} noValidate className="space-y-4 p-6 sm:p-8">
        <div>
          <h2 className="text-2xl">Gửi yêu cầu</h2>
          <p className="mt-1 text-sm text-ink-mute">Phản hồi trong 24 giờ, kể cả cuối tuần.</p>
        </div>
        <SelectField label="Chủ đề" value={form.topic} onChange={(e) => set('topic', e.target.value as TicketTopic)}>
          {Object.entries(TICKET_TOPICS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
        <TextField label="Họ và tên" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <TextField label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
          <TextField label="Số điện thoại" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
        </div>
        <TextField
          label="Mã đơn hàng (nếu có)"
          className="[&_input]:font-mono"
          value={form.orderCode}
          onChange={(e) => set('orderCode', e.target.value.toUpperCase())}
          error={errors.orderCode}
          placeholder="BW-123456"
        />
        <TextArea label="Nội dung" rows={5} value={form.message} onChange={(e) => set('message', e.target.value)} error={errors.message} />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft hover:text-ink">
          <Icon name="paperclip" size={16} />
          <span className="truncate">{form.attachment ?? 'Đính kèm ảnh (không bắt buộc)'}</span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => set('attachment', e.target.files?.[0]?.name)} />
        </label>
        <button type="submit" className="btn-ink w-full">
          Gửi yêu cầu
        </button>
      </form>
    </aside>
  )
}
