import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { COMMISSION_RATE, CONDITION_ORDER, CONDITIONS, LISTING_STATUS_LABEL, MIN_LISTING_PRICE, SELLER_STATUS_LABEL } from '../../data/catalog'
import { useBooks } from '../../controllers/useBooks'
import { useSellerCenter } from '../../controllers/useSeller'
import { formatDate, formatDateTime, formatMoney, formatNumber } from '../../models/format'
import { payoutOf, type ListingInput } from '../../models/listing'
import { priceCap, storePrice } from '../../models/pricing'
import { emptySellerForm, maskId, validateSellerForm, type SellerForm } from '../../models/seller'
import type { ConditionId, Listing, SellerApplication, User } from '../../models/types'
import { hasErrors, type Errors } from '../../models/validation'
import { readImage } from '../../services/imageService'
import { notifyError } from '../../services/toastService'
import { Icon } from './Icon'
import { ConfirmButton, EmptyState, Modal, SelectField, TextArea, TextField } from './ui'

const RULES = [
  'Chỉ đăng sách giấy bạn sở hữu, đúng tình trạng mô tả. Không bán sách photo, sách lậu.',
  'Giá bán không vượt mức trần theo tình trạng (70% giá bìa với sách như mới, 55% với sách đã dùng).',
  'Khi có đơn, bạn gửi sách về BookWise trong 48 giờ để kiểm định; BookWise đóng gói và giao cho người mua.',
  `BookWise thu phí ${COMMISSION_RATE * 100}% giá bán. Tiền được chuyển vào tài khoản của bạn khi người mua nhận hàng thành công.`,
  'Sách sai mô tả bị trả lại; vi phạm nhiều lần sẽ bị khoá quyền bán.',
]

export function SellerCenter({ user, presetBook }: { user: User; presetBook?: string }) {
  const center = useSellerCenter()
  const { application } = center
  const [reapply, setReapply] = useState(false)

  if (!application || (application.status === 'rejected' && reapply)) {
    return <ApplicationForm user={user} previous={application} onDone={() => setReapply(false)} />
  }
  if (application.status !== 'approved') {
    return <ApplicationStatus application={application} onReapply={() => setReapply(true)} />
  }
  return <SellerDashboard presetBook={presetBook} />
}

/* ---------------- Đăng ký ---------------- */

function ApplicationForm({ user, previous, onDone }: { user: User; previous?: SellerApplication; onDone: () => void }) {
  const { apply } = useSellerCenter()
  const [form, setForm] = useState<SellerForm>(() =>
    previous
      ? { ...emptySellerForm(previous.fullName, previous.phone), school: previous.school, pickupAddress: previous.pickupAddress, bankName: previous.bankName, bankAccount: previous.bankAccount, accountHolder: previous.accountHolder, idNumber: previous.idNumber }
      : emptySellerForm(user.name, user.phone),
  )
  const [errors, setErrors] = useState<Errors<SellerForm>>({})
  const set = (k: keyof SellerForm) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function submit(e: FormEvent) {
    e.preventDefault()
    const found = validateSellerForm(form)
    setErrors(found)
    if (hasErrors(found)) return
    if (apply(form).ok) onDone()
  }

  return (
    <div>
      <h2 className="text-2xl">Đăng ký bán sách trên BookWise</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Sinh viên có giáo trình, sách đã đọc xong có thể đăng bán lại cho bạn khác. Để bảo vệ người mua, BookWise cần xác minh danh tính
        trước khi cấp quyền bán. Hồ sơ được duyệt trong 1–2 ngày làm việc.
      </p>
      {previous?.reason && (
        <p className="mt-4 border-l-2 border-terra bg-card px-4 py-3 text-sm">
          <span className="font-semibold">Lần trước bị từ chối:</span> {previous.reason}
        </p>
      )}

      <form onSubmit={submit} noValidate className="mt-6 space-y-8">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="eyebrow mb-3">1. Thông tin định danh</legend>
          <TextField label="Họ và tên (như trên CCCD)" value={form.fullName} onChange={set('fullName')} error={errors.fullName} autoComplete="name" />
          <TextField label="Số điện thoại" inputMode="tel" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
          <TextField label="Số CCCD" inputMode="numeric" maxLength={12} value={form.idNumber} onChange={set('idNumber')} error={errors.idNumber} hint="12 chữ số, chỉ dùng để xác minh" />
          <div />
          <ImageField label="Ảnh mặt trước CCCD" value={form.idPhoto} onChange={(v) => setForm((f) => ({ ...f, idPhoto: v }))} error={errors.idPhoto} />
          <ImageField label="Ảnh thẻ sinh viên (không bắt buộc)" value={form.studentCardPhoto} onChange={(v) => setForm((f) => ({ ...f, studentCardPhoto: v }))} hint="Có thẻ sinh viên được gắn nhãn “Sinh viên” trên tin đăng" />
          <TextField className="sm:col-span-2" label="Trường đang học" value={form.school} onChange={set('school')} error={errors.school} placeholder="VD: ĐH Kinh tế TP. Hồ Chí Minh" />
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="eyebrow mb-3">2. Gửi sách & nhận tiền</legend>
          <TextField className="sm:col-span-2" label="Địa chỉ lấy sách" value={form.pickupAddress} onChange={set('pickupAddress')} error={errors.pickupAddress} hint="Nơi BookWise đến lấy sách khi có đơn, có thể là ký túc xá" />
          <TextField label="Ngân hàng" value={form.bankName} onChange={set('bankName')} error={errors.bankName} placeholder="VD: MB Bank" />
          <TextField label="Số tài khoản" inputMode="numeric" value={form.bankAccount} onChange={set('bankAccount')} error={errors.bankAccount} />
          <TextField className="sm:col-span-2" label="Chủ tài khoản" value={form.accountHolder} onChange={set('accountHolder')} error={errors.accountHolder} hint="Phải trùng họ tên trên CCCD" />
        </fieldset>

        <div>
          <p className="eyebrow mb-3">3. Quy định người bán</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
            {RULES.map((r) => <li key={r}>{r}</li>)}
          </ol>
          <label className="mt-4 flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={form.agree} onChange={(e) => setForm((f) => ({ ...f, agree: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-ink" />
            Tôi đã đọc và đồng ý với quy định người bán của BookWise
          </label>
          {errors.agree && <p className="mt-1.5 text-xs text-terra">{errors.agree}</p>}
        </div>

        <button type="submit" className="btn-primary">Gửi hồ sơ</button>
      </form>
    </div>
  )
}

function ImageField({ label, value, onChange, error, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string }) {
  const [busy, setBusy] = useState(false)
  async function pick(file?: File) {
    if (!file) return
    setBusy(true)
    try {
      onChange(await readImage(file))
    } catch (e) {
      notifyError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <p className="label">{label}</p>
      <label className={`flex h-36 cursor-pointer items-center justify-center overflow-hidden border border-dashed bg-card text-sm text-ink-mute hover:border-ink ${error ? 'border-terra' : 'border-rule'}`}>
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1.5">
            <Icon name="upload" size={20} />
            {busy ? 'Đang xử lý ảnh…' : 'Bấm để chọn ảnh'}
          </span>
        )}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {value && (
        <button type="button" onClick={() => onChange('')} className="mt-1 text-xs text-ink-mute underline underline-offset-4">Xoá ảnh</button>
      )}
      {error ? <p className="mt-1.5 text-xs text-terra">{error}</p> : hint && <p className="mt-1.5 text-xs text-ink-mute">{hint}</p>}
    </div>
  )
}

/* ---------------- Trạng thái hồ sơ ---------------- */

function ApplicationStatus({ application: a, onReapply }: { application: SellerApplication; onReapply: () => void }) {
  const tone = a.status === 'pending' ? 'border-ink-mute' : 'border-terra'
  return (
    <div>
      <h2 className="text-2xl">Hồ sơ người bán</h2>
      <div className={`mt-5 border-l-2 bg-card px-5 py-4 ${tone}`}>
        <p className="font-semibold">{SELLER_STATUS_LABEL[a.status]}</p>
        <p className="mt-1 text-sm text-ink-soft">
          {a.status === 'pending' && 'BookWise đang kiểm tra giấy tờ của bạn. Kết quả sẽ hiện ở đây trong 1–2 ngày làm việc.'}
          {a.status === 'rejected' && `Lý do: ${a.reason ?? 'Hồ sơ chưa hợp lệ'}`}
          {a.status === 'suspended' && `Quyền bán đang bị tạm khoá: ${a.reason ?? ''}. Các tin đăng đã được ẩn. Liên hệ hỗ trợ để được xem xét lại.`}
        </p>
        {a.status === 'rejected' && <button type="button" onClick={onReapply} className="btn-ink btn-sm mt-4">Bổ sung và gửi lại</button>}
        {a.status === 'suspended' && <Link to="/ho-tro" className="btn-ghost btn-sm mt-4">Liên hệ hỗ trợ</Link>}
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <Info label="Họ tên" value={a.fullName} />
        <Info label="CCCD" value={maskId(a.idNumber)} />
        <Info label="Trường" value={a.school || '—'} />
        <Info label="Tài khoản nhận tiền" value={`${a.bankName} · ${a.bankAccount.slice(-4).padStart(a.bankAccount.length, '•')}`} />
        <Info label="Gửi lúc" value={formatDateTime(a.submittedAt)} />
      </dl>

      <History application={a} />
    </div>
  )
}

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs text-ink-mute">{label}</dt>
    <dd className="mt-0.5">{value}</dd>
  </div>
)

export function History({ application }: { application: SellerApplication }) {
  return (
    <ol className="mt-6 space-y-2 border-t border-rule pt-4 text-sm">
      {[...application.history].reverse().map((h, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-32 shrink-0 text-xs text-ink-mute num">{formatDateTime(h.at)}</span>
          <span>
            <span className="font-medium">{SELLER_STATUS_LABEL[h.status]}</span>
            {h.note && <span className="text-ink-soft"> · {h.note}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

/* ---------------- Bảng điều khiển người bán ---------------- */

function SellerDashboard({ presetBook }: { presetBook?: string }) {
  const { application, myListings, sales, summary, togglePause, removeListing } = useSellerCenter()
  const books = useBooks()
  const [editing, setEditing] = useState<{ listing?: Listing; bookId?: string } | null>(() => (presetBook ? { bookId: presetBook } : null))
  const [armed, setArmed] = useState<string>()
  const bookOf = (id: string) => books.find((b) => b.id === id)

  const stats = [
    { label: 'Tin đang bán', value: formatNumber(myListings.filter((l) => l.status === 'active').length) },
    { label: 'Sách đã bán', value: formatNumber(summary.soldCount) },
    { label: 'Đang chờ đối soát', value: formatMoney(summary.holding) },
    { label: 'Đã nhận', value: formatMoney(summary.paid) },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">Kênh người bán</h2>
          <p className="mt-1 text-sm text-ink-mute">
            {application!.fullName} · {application!.school || 'Người bán cá nhân'} · tiền về {application!.bankName}
          </p>
        </div>
        <button type="button" onClick={() => setEditing({})} className="btn-primary btn-sm">
          <Icon name="plus" size={14} />
          Đăng bán sách
        </button>
      </div>

      <dl className="mt-6 grid grid-cols-2 border-y border-rule sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`py-4 ${i ? 'border-l border-rule pl-4' : ''} ${i === 2 ? 'max-sm:border-l-0 max-sm:pl-0' : ''}`}>
            <dt className="text-xs text-ink-mute">{s.label}</dt>
            <dd className="mt-1 font-display text-xl num">{s.value}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-8 text-lg">Tin đăng của bạn</h3>
      {myListings.length ? (
        <ul className="mt-3 divide-y divide-rule-soft border-y border-rule">
          {myListings.map((l) => {
            const book = bookOf(l.bookId)
            const locked = l.status === 'removed' || l.status === 'suspended'
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-4 py-3">
                {book && <img src={book.cover} alt="" className="h-14 w-10 shrink-0 bg-paper-deep object-cover" />}
                <div className="min-w-0 flex-1">
                  <Link to={`/sach/${l.bookId}`} className="font-medium hover:underline">{book?.title ?? l.bookId}</Link>
                  <p className="text-xs text-ink-mute">
                    {CONDITIONS[l.condition].label} · còn {l.qty} · đã bán {l.sold} ·{' '}
                    <span className={l.status === 'active' ? 'text-forest' : locked ? 'text-terra' : ''}>{LISTING_STATUS_LABEL[l.status]}</span>
                  </p>
                  {l.reason && <p className="mt-0.5 text-xs text-terra">Lý do: {l.reason}</p>}
                </div>
                <span className="font-semibold num">{formatMoney(l.price)}</span>
                <div className="flex gap-2">
                  {!locked && (
                    <>
                      <button type="button" onClick={() => setEditing({ listing: l })} className="btn-ghost btn-sm">Sửa</button>
                      <button type="button" onClick={() => togglePause(l)} className="btn-ghost btn-sm">{l.status === 'active' ? 'Ẩn' : 'Hiện'}</button>
                    </>
                  )}
                  <ConfirmButton armed={armed === l.id} onArm={() => setArmed(l.id)} onConfirm={() => removeListing(l)} armedLabel="Xác nhận xoá">
                    Xoá
                  </ConfirmButton>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState title="Chưa có tin đăng nào" action={<button type="button" onClick={() => setEditing({})} className="btn-ink">Đăng cuốn đầu tiên</button>}>
          Chọn sách trong danh mục BookWise, đặt giá và số lượng. Tin hiện ngay trên trang sách.
        </EmptyState>
      )}

      <h3 className="mt-10 text-lg">Lịch sử bán & đối soát</h3>
      {sales.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-ink text-left">
                {['Đơn', 'Sách', 'SL', 'Giá bán', 'Bạn nhận', 'Trạng thái'].map((h) => <th key={h} className="eyebrow py-2 pr-4 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule-soft">
              {sales.map((s, i) => (
                <tr key={`${s.orderCode}-${i}`}>
                  <td className="py-2 pr-4 num">{s.orderCode}<span className="block text-2xs text-ink-mute">{formatDate(s.at)}</span></td>
                  <td className="max-w-[14rem] truncate py-2 pr-4">{s.title}</td>
                  <td className="py-2 pr-4 num">{s.qty}</td>
                  <td className="py-2 pr-4 num">{formatMoney(s.unitPrice)}</td>
                  <td className="py-2 pr-4 font-medium num">{s.state === 'cancelled' ? '—' : formatMoney(s.payout)}</td>
                  <td className={`py-2 text-xs ${s.state === 'paid' ? 'text-forest' : s.state === 'cancelled' ? 'text-terra' : 'text-ink-soft'}`}>
                    {s.state === 'paid' ? 'Đã chuyển tiền' : s.state === 'cancelled' ? 'Đơn huỷ' : 'Chờ giao xong'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-mute">Chưa có đơn nào mua sách của bạn.</p>
      )}
      <p className="mt-3 text-xs text-ink-mute">
        Bạn nhận {100 - COMMISSION_RATE * 100}% giá bán; BookWise giữ {COMMISSION_RATE * 100}% cho kiểm định, đóng gói và giao hàng. Tiền được chuyển khi người mua nhận hàng.
      </p>

      {editing && <ListingEditor listing={editing.listing} bookId={editing.bookId} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ListingEditor({ listing, bookId, onClose }: { listing?: Listing; bookId?: string; onClose: () => void }) {
  const { saveListing } = useSellerCenter()
  const books = useBooks()
  const sorted = useMemo(() => [...books].sort((a, b) => a.title.localeCompare(b.title, 'vi')), [books])
  const [form, setForm] = useState({
    bookId: listing?.bookId ?? (books.some((b) => b.id === bookId) ? bookId! : ''),
    condition: listing?.condition ?? ('used' as ConditionId),
    price: listing ? String(listing.price) : '',
    qty: String(listing?.qty ?? 1),
    note: listing?.note ?? '',
  })
  const [error, setError] = useState<string>()
  const book = books.find((b) => b.id === form.bookId)
  const price = Number(form.price) || 0

  function submit(e: FormEvent) {
    e.preventDefault()
    const input: ListingInput = { bookId: form.bookId, condition: form.condition, price, qty: Number(form.qty), note: form.note }
    const result = saveListing(input, listing)
    if (result.ok) onClose()
    else setError(result.error)
  }

  return (
    <Modal open onClose={onClose} title={listing ? 'Sửa tin đăng' : 'Đăng bán sách'} width="max-w-xl">
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <SelectField className="sm:col-span-2" label="Đầu sách" value={form.bookId} disabled={!!listing} onChange={(e) => setForm((f) => ({ ...f, bookId: e.target.value }))}>
          <option value="">— Chọn sách —</option>
          {sorted.map((b) => <option key={b.id} value={b.id}>{b.title} — {b.author}</option>)}
        </SelectField>
        <div className="sm:col-span-2">
          <p className="label">Tình trạng</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONDITION_ORDER.map((c) => (
              <label key={c} className={`cursor-pointer border px-3 py-2.5 text-sm ${form.condition === c ? 'border-ink bg-card' : 'border-rule'}`}>
                <input type="radio" name="condition" className="sr-only" checked={form.condition === c} onChange={() => setForm((f) => ({ ...f, condition: c }))} />
                <span className="font-medium">{CONDITIONS[c].label}</span>
                <span className="block text-2xs text-ink-mute">{CONDITIONS[c].note}</span>
              </label>
            ))}
          </div>
        </div>
        <TextField
          label="Giá bán (đ)"
          inputMode="numeric"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/\D/g, '') }))}
          hint={book ? `Từ ${formatMoney(MIN_LISTING_PRICE)} đến ${formatMoney(priceCap(book, form.condition))}` : undefined}
        />
        <TextField label="Số lượng" inputMode="numeric" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value.replace(/\D/g, '') }))} />
        <TextArea className="sm:col-span-2" label="Mô tả tình trạng" rows={3} maxLength={300} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="VD: Có highlight vài trang chương 3, gáy còn chắc" />

        {book && (
          <div className="sm:col-span-2 grid grid-cols-3 border border-rule bg-card text-center text-xs">
            <div className="p-2.5"><p className="text-ink-mute">Giá bìa</p><p className="mt-0.5 font-medium num">{formatMoney(book.listPrice)}</p></div>
            <div className="border-x border-rule p-2.5"><p className="text-ink-mute">BookWise bán</p><p className="mt-0.5 font-medium num">{formatMoney(storePrice(book, form.condition))}</p></div>
            <div className="p-2.5"><p className="text-ink-mute">Bạn nhận về</p><p className="mt-0.5 font-semibold text-forest num">{price ? formatMoney(payoutOf(price)) : '—'}</p></div>
          </div>
        )}

        {error && <p className="sm:col-span-2 text-sm text-terra">{error}</p>}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Huỷ</button>
          <button type="submit" className="btn-primary">{listing ? 'Lưu thay đổi' : 'Đăng bán'}</button>
        </div>
      </form>
    </Modal>
  )
}
