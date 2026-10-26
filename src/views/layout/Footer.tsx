import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../../data/catalog'
import { notify } from '../../services/toastService'
import { resetAllStores } from '../../services/store'
import { Logo } from '../components/Logo'

export function Footer() {
  const [armed, setArmed] = useState(false)

  function reset() {
    if (!armed) {
      setArmed(true)
      window.setTimeout(() => setArmed(false), 4000)
      return
    }
    resetAllStores()
    setArmed(false)
    notify('Đã khôi phục dữ liệu demo ban đầu')
  }

  return (
    <footer className="mt-24 border-t border-ink bg-paper-deep">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
            Chợ sách cũ giá rẻ cho sinh viên, mọi cuốn đều qua kiểm định. Đọc nhiều hơn, tốn ít hơn, và để mỗi cuốn sách có thêm một người đọc.
          </p>
        </div>
        <FooterCol title="Tủ sách" links={CATEGORIES.map((c) => ({ to: `/sach?the-loai=${c.id}`, label: c.name }))} />
        <FooterCol
          title="Mua hàng"
          links={[
            { to: '/gio-hang', label: 'Giỏ hàng' },
            { to: '/don-hang', label: 'Tra cứu đơn hàng' },
            { to: '/tai-khoan', label: 'Tài khoản' },
            { to: '/#thu-mua', label: 'Bán lại sách cũ' },
          ]}
        />
        <FooterCol
          title="BookWise"
          links={[
            { to: '/ho-tro', label: 'Trung tâm hỗ trợ' },
            { to: '/bao-cao', label: 'Báo cáo nghiên cứu' },
            { to: '/quan-tri', label: 'Trang quản trị' },
          ]}
        />
      </div>
      <div className="border-t border-rule">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-ink-mute sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} BookWise · Dự án môn học ISC301. Dữ liệu lưu trên trình duyệt của bạn.</p>
          <button type="button" onClick={reset} className={`self-start text-left underline underline-offset-4 sm:self-auto ${armed ? 'text-terra' : 'hover:text-ink'}`}>
            {armed ? 'Bấm lần nữa để xoá giỏ, đơn hàng, tài khoản demo' : 'Khôi phục dữ liệu demo'}
          </button>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-sm text-ink-soft hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
