import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { STATUS_LABEL } from '../../data/catalog'
import type { OrderStatus } from '../../models/types'
import { Icon } from './Icon'

/** Tiêu đề mục kiểu tạp chí: số thứ tự + tiêu đề serif + đường kẻ mảnh */
export function SectionHeading({ index, title, kicker, action }: { index?: string; title: ReactNode; kicker?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-3 border-t border-ink pt-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">
          {index && <span className="mr-3 font-mono text-ink">{index}</span>}
          {kicker}
        </p>
        <h2 className="mt-2 text-[1.75rem] leading-tight sm:text-[2.1rem]">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2 text-sm font-medium text-ink">
      <span className="underline decoration-rule underline-offset-4 group-hover:decoration-ink">{children}</span>
      <Icon name="arrowRight" size={16} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

interface FieldShell {
  label: string
  error?: string
  hint?: string
  className?: string
}

export function TextField({ label, error, hint, className, ...input }: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} className="field" aria-invalid={!!error} aria-describedby={error || hint ? `${id}-msg` : undefined} {...input} />
      <FieldMessage id={`${id}-msg`} error={error} hint={hint} />
    </div>
  )
}

export function SelectField({ label, error, hint, className, children, ...select }: FieldShell & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <select id={id} className="field appearance-none pr-9" aria-invalid={!!error} {...select}>
          {children}
        </select>
        <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute" />
      </div>
      <FieldMessage id={`${id}-msg`} error={error} hint={hint} />
    </div>
  )
}

export function TextArea({ label, error, hint, className, ...area }: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea id={id} className="field min-h-24 resize-y" aria-invalid={!!error} {...area} />
      <FieldMessage id={`${id}-msg`} error={error} hint={hint} />
    </div>
  )
}

function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) return <p id={id} className="mt-1.5 text-xs text-terra">{error}</p>
  if (hint) return <p id={id} className="mt-1.5 text-xs text-ink-mute">{hint}</p>
  return null
}

export function QtyStepper({ value, max, onChange, size = 'md' }: { value: number; max: number; onChange: (v: number) => void; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11'
  return (
    <div className="inline-flex items-center border border-rule bg-card">
      <button type="button" className={`${h} grid place-items-center text-ink hover:bg-paper-deep disabled:opacity-30`} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Giảm">
        <Icon name="minus" size={14} />
      </button>
      <input
        className={`${size === 'sm' ? 'h-8 w-9' : 'h-11 w-12'} border-x border-rule bg-transparent text-center text-sm num focus:outline-none`}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ''))
          if (n) onChange(Math.min(n, max))
        }}
        aria-label="Số lượng"
      />
      <button type="button" className={`${h} grid place-items-center text-ink hover:bg-paper-deep disabled:opacity-30`} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Tăng">
        <Icon name="plus" size={14} />
      </button>
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 animate-fade sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal aria-label={title} className={`max-h-[92vh] w-full ${width} overflow-y-auto bg-paper focus:outline-none animate-toast`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-paper px-5 py-4 sm:px-6">
          <h2 className="text-xl">{title}</h2>
          <button type="button" onClick={onClose} className="-mr-2 grid h-9 w-9 place-items-center text-ink-soft hover:text-ink" aria-label="Đóng">
            <Icon name="close" />
          </button>
        </div>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  )
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'text-ink-soft',
  confirmed: 'text-forest',
  shipping: 'text-forest',
  delivered: 'text-forest',
  cancelled: 'text-terra',
}

export function StatusTag({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${status === 'pending' ? 'opacity-50' : ''}`} />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-rule px-6 py-14 text-center">
      <p className="font-display text-xl">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null
  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Phân trang">
      <button type="button" className="grid h-10 w-10 place-items-center text-ink disabled:opacity-30" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Trang trước">
        <Icon name="chevronLeft" size={18} />
      </button>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`h-10 min-w-10 px-2 text-sm num ${p === page ? 'bg-ink text-paper' : 'text-ink hover:bg-paper-deep'}`}
        >
          {p}
        </button>
      ))}
      <button type="button" className="grid h-10 w-10 place-items-center text-ink disabled:opacity-30" onClick={() => onChange(page + 1)} disabled={page === pageCount} aria-label="Trang sau">
        <Icon name="chevronRight" size={18} />
      </button>
    </nav>
  )
}

/** Nút cần bấm hai lần để xác nhận (xoá, huỷ) — tránh dùng hộp thoại confirm của trình duyệt */
export function ConfirmButton({ armed, onArm, onConfirm, children, armedLabel = 'Bấm lần nữa để xác nhận', className = 'btn-ghost btn-sm' }: {
  armed: boolean
  onArm: () => void
  onConfirm: () => void
  children: ReactNode
  armedLabel?: string
  className?: string
}) {
  return (
    <button type="button" onClick={armed ? onConfirm : onArm} className={`${className} ${armed ? '!border-terra !text-terra' : ''}`}>
      {armed ? armedLabel : children}
    </button>
  )
}
