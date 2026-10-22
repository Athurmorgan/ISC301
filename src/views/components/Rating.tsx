import { formatNumber } from '../../models/format'
import { Star } from './Icon'

export function Rating({ value, count, size = 12 }: { value: number; count?: number; size?: number }) {
  if (!value) return <span className="text-xs text-ink-mute">Chưa có đánh giá</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft" aria-label={`${value} trên 5 sao`}>
      <span className="flex text-ink">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={size} filled={Math.min(1, Math.max(0, value - i + 1))} />
        ))}
      </span>
      <span className="num">{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-ink-mute num">({formatNumber(count)})</span>}
    </span>
  )
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 text-ink" role="radiogroup" aria-label="Số sao">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} sao`}
          onClick={() => onChange(i)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star size={22} filled={i <= value ? 1 : 0} />
        </button>
      ))}
    </div>
  )
}
