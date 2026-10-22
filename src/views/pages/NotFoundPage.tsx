import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="font-mono text-sm text-ink-mute">404</p>
        <h1 className="mt-4 text-4xl sm:text-5xl">Trang này không có trên kệ.</h1>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">Có thể đường dẫn đã cũ hoặc cuốn sách đã ngừng phát hành.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="btn-ink">Về trang chủ</Link>
          <Link to="/sach" className="btn-ghost">Vào tủ sách</Link>
        </div>
      </div>
    </section>
  )
}
