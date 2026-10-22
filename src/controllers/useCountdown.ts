import { useEffect, useState } from 'react'

const endOfToday = () => {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

/** Đếm ngược đến hết ngày — chương trình giá tốt làm mới mỗi ngày */
export function useCountdownToMidnight() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const left = Math.max(0, endOfToday() - now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    hours: pad(Math.floor(left / 3_600_000)),
    minutes: pad(Math.floor((left / 60_000) % 60)),
    seconds: pad(Math.floor((left / 1000) % 60)),
  }
}
