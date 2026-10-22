/** Biểu tượng: cuốn sách mở, hai trang ghép thành chữ W, dải đánh dấu ở gáy */
export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" fill="var(--color-forest)" />
      <path d="M6 9.5 11 23l5-9 5 9 5-13.5" fill="none" stroke="var(--color-paper)" strokeWidth="2.4" strokeLinejoin="miter" strokeLinecap="square" />
      <path d="M6 9.5c3.2-1.6 6.8-1.6 10 0 3.2-1.6 6.8-1.6 10 0" fill="none" stroke="var(--color-paper)" strokeWidth="1.4" />
    </svg>
  )
}

/** Logo đầy đủ; tone="light" dùng trên nền tối */
export function Logo({ tone = 'dark', size = 32 }: { tone?: 'dark' | 'light'; size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} className={tone === 'light' ? 'outline outline-1 outline-paper/20' : ''} />
      <span className={`font-display text-[1.55rem] leading-none tracking-tight ${tone === 'light' ? 'text-paper' : 'text-ink'}`}>
        <span className="font-semibold">Book</span>
        <span className="font-normal italic">Wise</span>
      </span>
    </span>
  )
}
