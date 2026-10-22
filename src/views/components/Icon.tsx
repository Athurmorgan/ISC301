// Bộ icon nét mảnh tự vẽ (stroke 1.5) để giữ giao diện nhất quán, không phụ thuộc font icon.

const PATHS = {
  search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm5.3-2.2L21 21',
  bag: 'M5 8h14l-1 12.5a1 1 0 0 1-1 .9H7a1 1 0 0 1-1-.9L5 8Zm3.5 0V6.5a3.5 3.5 0 0 1 7 0V8',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7.5 8.5c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5',
  menu: 'M3.5 7h17M3.5 12h17M3.5 17h17',
  close: 'M6 6l12 12M18 6 6 18',
  arrowRight: 'M4 12h15m-5-5 5 5-5 5',
  arrowLeft: 'M20 12H5m5-5-5 5 5 5',
  check: 'm4.5 12.5 5 5 10-11',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  truck: 'M2.5 6.5h11v10h-11zM13.5 10h4l3 3.5v3h-7M6 19.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Zm11 0a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z',
  shield: 'M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Zm-3.5 9 2.5 2.5 4.5-5',
  refresh: 'M4 12a8 8 0 0 1 14.3-4.9M20 4v4h-4M20 12a8 8 0 0 1-14.3 4.9M4 20v-4h4',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7m-8 0 .8 12.6a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9L17.5 7',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  download: 'M12 4v11m-5-5 5 5 5-5M4.5 19.5h15',
  print: 'M7 9V3.5h10V9M7 17H4.5V9h15v8H17M7 14h10v6.5H7z',
  lock: 'M6.5 10.5h11v10h-11zM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm9.5-13.5 4 4',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 18.5h1.5M18.5 14H20',
  card: 'M3 6.5h18v11H3zM3 10h18M6.5 14.5h4',
  wallet: 'M4 7.5h15.5v12H4zM4 7.5 16 4v3.5M15.5 13.5h1',
  cash: 'M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 10v4M18 10v4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5.5H4.5V6H10',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5V12l3 2',
  paperclip: 'm20 11.5-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  key: 'M21 2l-2 2m-1.5 1.5L16 7l1.5 1.5L16 10l-1.5-1.5-2 2a6.5 6.5 0 1 1-2.12-2.12l8.62-8.62z',
  tag: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  image: 'M3 3h18v18H3V3zm3 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm15 11-6-7-4 5-3-3.5L3 18h18z',
} as const

export type IconName = keyof typeof PATHS

interface Props {
  name: IconName
  size?: number
  className?: string
  title?: string
  filled?: boolean
}

export function Icon({ name, size = 20, className, title, filled }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  )
}

export function Star({ filled, size = 12 }: { filled: number; size?: number }) {
  // filled: 0..1 — tô một phần ngôi sao
  const id = `s${Math.round(filled * 100)}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${filled * 100}%`} stopColor="currentColor" />
          <stop offset={`${filled * 100}%`} stopColor="currentColor" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8L12 2.8Z" />
    </svg>
  )
}
