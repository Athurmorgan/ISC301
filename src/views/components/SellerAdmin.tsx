import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CONDITIONS, LISTING_STATUS_LABEL, SELLER_STATUS_LABEL } from '../../data/catalog'
import { useBooks } from '../../controllers/useBooks'
import { useSellerAdmin } from '../../controllers/useSeller'
import { formatDateTime, formatMoney, normalize } from '../../models/format'
import { priceCap } from '../../models/pricing'
import { maskId } from '../../models/seller'
import type { ListingStatus, SellerApplication, SellerStatus } from '../../models/types'
import { History } from './SellerCenter'
import { EmptyState, Modal, TextArea } from './ui'

const STATUS_TONE: Record<SellerStatus, string> = {
  pending: 'text-ink-soft',
  approved: 'text-forest',
  rejected: 'text-terra',
  suspended: 'text-terra',
}

/** Duyệt hồ sơ người bán: xem giấy tờ, cấp quyền, từ chối hoặc khoá */
export function SellersPanel() {
  const { applications } = useSellerAdmin()
  const [filter, setFilter] = useState<SellerStatus | 'all'>('pending')
  const [open, setOpen] = useState<string>()
  const sorted = [...applications].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const shown = filter === 'all' ? sorted : sorted.filter((a) => a.status === filter)
  const current = applications.find((a) => a.email === open)

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(['pending', 'approved', 'rejected', 'suspended', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`h-8 border px-3 text-xs ${filter === s ? 'border-ink bg-ink text-paper' : 'border-rule text-ink-soft hover:border-ink'}`}
          >
            {s === 'all' ? 'Tất cả' : SELLER_STATUS_LABEL[s]} ({s === 'all' ? applications.length : applications.filter((a) => a.status === s).length})
          </button>
        ))}
      </div>

      {shown.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-ink text-left">
                {['Người đăng ký', 'CCCD', 'Trường', 'Gửi lúc', 'Trạng thái', ''].map((h) => <th key={h} className="eyebrow py-3 pr-4 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule-soft">
              {shown.map((a) => (
                <tr key={a.email}>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium">{a.fullName}</p>
                    <p className="text-xs text-ink-mute">{a.email} · {a.phone}</p>
                  </td>
                  <td className="py-2.5 pr-4 num">{maskId(a.idNumber)}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">
                    {a.school || '—'}
                    {a.studentCardPhoto && <span className="tag ml-2 text-forest">Có thẻ SV</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-ink-soft num">{formatDateTime(a.submittedAt)}</td>
                  <td className={`py-2.5 pr-4 text-xs font-semibold ${STATUS_TONE[a.status]}`}>{SELLER_STATUS_LABEL[a.status]}</td>
                  <td className="py-2.5 text-right">
                    <button type="button" onClick={() => setOpen(a.email)} className="btn-ghost btn-sm">{a.status === 'pending' ? 'Duyệt' : 'Xem'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Không có hồ sơ nào">Hồ sơ người dùng gửi ở mục “Kênh người bán” trong tài khoản sẽ hiện tại đây.</EmptyState>
      )}

      {current && <ReviewModal application={current} onClose={() => setOpen(undefined)} />}
    </div>
  )
}

function ReviewModal({ application: a, onClose }: { application: SellerApplication; onClose: () => void }) {
  const { review } = useSellerAdmin()
  const [note, setNote] = useState('')
  const act = (status: SellerStatus) => {
    if (status !== 'approved' && !note.trim()) return review(a, status, '')
    review(a, status, note)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Hồ sơ người bán — ${a.fullName}`} width="max-w-3xl">
      <div className="grid gap-6 sm:grid-cols-2">
        <dl className="space-y-2.5 text-sm">
          {[
            ['Email', a.email],
            ['Số điện thoại', a.phone],
            ['Số CCCD', a.idNumber],
            ['Trường', a.school || '—'],
            ['Địa chỉ lấy sách', a.pickupAddress],
            ['Ngân hàng', `${a.bankName} · ${a.bankAccount}`],
            ['Chủ tài khoản', a.accountHolder],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[8rem_1fr] gap-2">
              <dt className="text-ink-mute">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="space-y-3">
          <Photo label="Mặt trước CCCD" src={a.idPhoto} />
          {a.studentCardPhoto && <Photo label="Thẻ sinh viên" src={a.studentCardPhoto} />}
        </div>
      </div>

      <p className="mt-5 border-l-2 border-rule pl-3 text-xs text-ink-mute">
        Đối chiếu: họ tên và số CCCD trên ảnh khớp với thông tin khai báo, ảnh rõ nét và không bị chỉnh sửa; chủ tài khoản ngân hàng trùng họ tên.
      </p>

      <History application={a} />

      <TextArea className="mt-5" label="Ghi chú / lý do" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bắt buộc khi từ chối hoặc khoá, người bán sẽ thấy nội dung này" />

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {a.status === 'pending' && (
          <>
            <button type="button" onClick={() => act('rejected')} className="btn-ghost">Từ chối</button>
            <button type="button" onClick={() => act('approved')} className="btn-primary">Cấp quyền bán</button>
          </>
        )}
        {a.status === 'approved' && <button type="button" onClick={() => act('suspended')} className="btn-ghost text-terra">Khoá quyền bán</button>}
        {a.status === 'suspended' && <button type="button" onClick={() => act('approved')} className="btn-primary">Mở khoá</button>}
        {a.status === 'rejected' && <p className="text-sm text-ink-mute">Đang chờ người dùng bổ sung hồ sơ.</p>}
      </div>
    </Modal>
  )
}

function Photo({ label, src }: { label: string; src?: string }) {
  return (
    <figure>
      <figcaption className="mb-1 text-xs text-ink-mute">{label}</figcaption>
      {src ? (
        <a href={src} target="_blank" rel="noreferrer">
          <img src={src} alt={label} className="max-h-48 w-full border border-rule bg-paper-deep object-contain" />
        </a>
      ) : (
        <div className="grid h-32 place-items-center border border-dashed border-rule text-xs text-ink-mute">Ảnh chỉ lưu trên máy người gửi</div>
      )}
    </figure>
  )
}

/** Kiểm soát tin đăng của người bán: gỡ tin sai quy định, khôi phục */
export function ListingsPanel() {
  const { listings, takeDown, restore } = useSellerAdmin()
  const books = useBooks()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<ListingStatus | 'all'>('all')
  const [removing, setRemoving] = useState<string>()
  const [reason, setReason] = useState('')

  const rows = listings
    .map((l) => ({ l, book: books.find((b) => b.id === l.bookId) }))
    .filter(({ l, book }) => (filter === 'all' || l.status === filter) && (!q || normalize(`${book?.title} ${l.sellerName} ${l.sellerId}`).includes(normalize(q))))
    .sort((a, b) => b.l.updatedAt.localeCompare(a.l.updatedAt))
  const target = listings.find((l) => l.id === removing)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sách, người bán" className="field h-9 max-w-xs py-0" aria-label="Tìm tin đăng" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as ListingStatus | 'all')} className="field h-9 w-auto py-0" aria-label="Lọc trạng thái">
          <option value="all">Mọi trạng thái</option>
          {(Object.keys(LISTING_STATUS_LABEL) as ListingStatus[]).map((s) => <option key={s} value={s}>{LISTING_STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-ink text-left">
                {['Sách', 'Người bán', 'Tình trạng', 'Giá', 'Còn / đã bán', 'Trạng thái', ''].map((h) => <th key={h} className="eyebrow py-3 pr-4 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule-soft">
              {rows.map(({ l, book }) => {
                const overCap = book && l.price > priceCap(book, l.condition)
                return (
                  <tr key={l.id}>
                    <td className="py-2.5 pr-4">
                      <Link to={`/sach/${l.bookId}`} className="block max-w-[15rem] truncate font-medium hover:underline">{book?.title ?? l.bookId}</Link>
                      {l.note && <p className="max-w-[15rem] truncate text-xs text-ink-mute" title={l.note}>{l.note}</p>}
                    </td>
                    <td className="py-2.5 pr-4">
                      {l.sellerName}
                      <p className="text-xs text-ink-mute">{l.sellerId}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-ink-soft">{CONDITIONS[l.condition].label}</td>
                    <td className={`py-2.5 pr-4 num ${overCap ? 'font-semibold text-terra' : ''}`}>
                      {formatMoney(l.price)}
                      {overCap && <span className="block text-2xs">Vượt giá trần</span>}
                    </td>
                    <td className="py-2.5 pr-4 num text-ink-soft">{l.qty} / {l.sold}</td>
                    <td className={`py-2.5 pr-4 text-xs ${l.status === 'active' ? 'text-forest' : l.status === 'removed' ? 'text-terra' : 'text-ink-soft'}`}>
                      {LISTING_STATUS_LABEL[l.status]}
                      {l.reason && <span className="block text-ink-mute">{l.reason}</span>}
                    </td>
                    <td className="py-2.5 text-right">
                      {l.status === 'removed' ? (
                        <button type="button" onClick={() => restore(l)} className="btn-ghost btn-sm">Khôi phục</button>
                      ) : l.status !== 'suspended' ? (
                        <button type="button" onClick={() => { setRemoving(l.id); setReason('') }} className="btn-ghost btn-sm text-terra">Gỡ tin</button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Không có tin đăng phù hợp" />
      )}

      {target && (
        <Modal open onClose={() => setRemoving(undefined)} title="Gỡ tin đăng">
          <TextArea label="Lý do gỡ" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Ảnh / mô tả không đúng sách, giá bất thường, sách photo" />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setRemoving(undefined)} className="btn-ghost">Huỷ</button>
            <button
              type="button"
              onClick={() => {
                if (reason.trim()) setRemoving(undefined)
                takeDown(target, reason)
              }}
              className="btn-primary"
            >
              Gỡ tin
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
