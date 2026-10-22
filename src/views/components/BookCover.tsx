import { useState } from 'react'

interface Props {
  src: string
  title: string
  author?: string
  className?: string
  /** Ảnh ở màn hình đầu tiên nên tải ngay */
  eager?: boolean
}

const FALLBACK_TONES = ['#1f4d3a', '#7a3b22', '#2e3a4f', '#5b4a2f']

/**
 * Bìa sách tỉ lệ 2:3. Khi không có ảnh (sách admin mới thêm) thì dựng một bìa chữ
 * giản dị thay vì để khung trống.
 */
export function BookCover({ src, title, author, className = '', eager }: Props) {
  const [broken, setBroken] = useState(false)
  const tone = FALLBACK_TONES[title.length % FALLBACK_TONES.length]

  return (
    <div className={`relative aspect-[2/3] overflow-hidden bg-paper-deep cover-shadow ${className}`}>
      {src && !broken ? (
        <img
          src={src}
          alt={`Bìa sách ${title}`}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full flex-col justify-between p-[10%] text-paper" style={{ background: tone }}>
          <span className="font-display text-[clamp(0.8rem,1.6vw,1.15rem)] leading-tight">{title}</span>
          {author && <span className="text-[0.6rem] uppercase tracking-widest opacity-80">{author}</span>}
        </div>
      )}
      {/* Gáy sách: vệt sáng mảnh bên trái */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-r from-black/20 to-transparent" />
    </div>
  )
}
