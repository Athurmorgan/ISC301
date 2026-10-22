import { formatMoney, percentOff } from '../../models/format'

interface Props {
  price: number
  listPrice?: number
  size?: 'sm' | 'md' | 'lg'
  highlight?: boolean
}

const SIZES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-[1.75rem] leading-none',
}

export function Price({ price, listPrice, size = 'md', highlight }: Props) {
  const off = listPrice ? percentOff(price, listPrice) : 0
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 num">
      <span className={`font-semibold ${SIZES[size]} ${highlight ? 'text-terra' : 'text-ink'}`}>{formatMoney(price)}</span>
      {off > 0 && (
        <>
          <s className="text-xs text-ink-mute">{formatMoney(listPrice!)}</s>
          <span className="text-xs font-medium text-terra">−{off}%</span>
        </>
      )}
    </span>
  )
}
