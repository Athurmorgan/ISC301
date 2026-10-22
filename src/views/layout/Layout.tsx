import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { usePresenceBeacon } from '../../controllers/useLive'
import { useStore } from '../../controllers/useStore'
import { dismiss, toastStore } from '../../services/toastService'
import { Icon } from '../components/Icon'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout() {
  const { pathname, hash } = useLocation()
  usePresenceBeacon()

  // Về đầu trang khi đổi trang; cuộn tới neo nếu URL có #
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView())
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [pathname, hash])

  return (
    <div className="flex min-h-svh flex-col">
      <a href="#noi-dung" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Bỏ qua điều hướng
      </a>
      <Header />
      <main id="noi-dung" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ToastHost />
    </div>
  )
}

function ToastHost() {
  const toasts = useStore(toastStore)
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 px-4 py-3 text-sm text-paper shadow-lg animate-toast ${t.tone === 'error' ? 'bg-terra' : 'bg-ink'}`}
        >
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <Link to={t.action.to} onClick={() => dismiss(t.id)} className="shrink-0 font-semibold underline underline-offset-4">
              {t.action.label}
            </Link>
          )}
          <button type="button" onClick={() => dismiss(t.id)} className="-mr-1 shrink-0 opacity-60 hover:opacity-100" aria-label="Đóng thông báo">
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
