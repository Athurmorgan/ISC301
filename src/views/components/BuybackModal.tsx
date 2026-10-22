import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../controllers/useAuth'
import { useBuybacks } from '../../controllers/useBuyback'
import { formatMoney } from '../../models/format'
import { buybackQuote } from '../../models/pricing'
import type { Book, BuybackRequest, ConditionId } from '../../models/types'
import { Icon } from './Icon'
import { Modal, SelectField, TextField } from './ui'

interface Props {
  book?: Book
  initialCondition?: Exclude<ConditionId, 'seal'>
  onClose: () => void
}

export function BuybackModal({ book, initialCondition = 'likenew', onClose }: Props) {
  const { user } = useAuth()
  const { create } = useBuybacks()

  const [condition, setCondition] = useState<Exclude<ConditionId, 'seal'>>(initialCondition)
  const [bookTitle, setBookTitle] = useState(book?.title ?? '')
  const [author, setAuthor] = useState(book?.author ?? '')
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [address, setAddress] = useState(
    user?.address
      ? [user.address.street, user.address.district, user.address.province].filter(Boolean).join(', ')
      : '',
  )
  const [bankName, setBankName] = useState('Vietcombank')
  const [bankAccount, setBankAccount] = useState('')
  const [accountHolder, setAccountHolder] = useState(user?.name ?? '')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<string>()
  const [error, setError] = useState('')
  const [created, setCreated] = useState<BuybackRequest | null>(null)

  const estimated = book
    ? buybackQuote(book, condition)
    : condition === 'likenew'
      ? 50000
      : 30000

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      return setError('Dung lượng ảnh tối đa 2MB')
    }
    const reader = new FileReader()
    reader.onload = () => {
      setPhoto(reader.result as string)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const res = create({
      bookId: book?.id,
      bookTitle,
      author,
      condition,
      estimatedPrice: estimated,
      customerName: name,
      phone,
      email,
      address,
      bankName,
      bankAccount,
      accountHolder,
      note,
      photo,
    })

    if (!res.ok) return setError(res.error)
    setCreated(res.value)
  }

  return (
    <Modal open onClose={onClose} title="Yêu cầu bán lại sách cũ" width="max-w-xl">
      {created ? (
        <div className="space-y-4 py-2">
          <div className="border border-forest/30 bg-forest-tint p-4 text-forest">
            <div className="flex items-center gap-2">
              <Icon name="check" size={20} />
              <p className="font-semibold text-base">Gửi yêu cầu thu mua thành công!</p>
            </div>
            <p className="mt-2 text-sm">
              Mã yêu cầu của bạn là <strong className="font-mono text-base">{created.code}</strong>.
            </p>
            <p className="mt-1 text-xs text-forest/90">
              Chuyên viên điều phối BookWise sẽ liên hệ qua số điện thoại <strong>{created.phone}</strong> trong 24 giờ để hẹn bưu tá qua lấy sách tận nhà.
            </p>
          </div>
          <div className="border border-rule p-4 text-sm space-y-1.5 bg-paper">
            <p><strong>Cuốn sách:</strong> {created.bookTitle} ({created.condition === 'likenew' ? 'Như mới 98%' : 'Đã sử dụng 90%'})</p>
            <p><strong>Giá ước tính:</strong> <span className="text-forest font-semibold num">{formatMoney(created.estimatedPrice)}</span></p>
            <p><strong>Tài khoản nhận tiền:</strong> {created.bankName} - {created.bankAccount} ({created.accountHolder})</p>
            <p><strong>Địa chỉ lấy sách:</strong> {created.address}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Link to="/tai-khoan?tab=buyback" onClick={onClose} className="btn-ink">
              Xem tiến trình trong tài khoản
            </Link>
            <button type="button" onClick={onClose} className="btn-ghost">
              Đóng
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="border border-rule bg-paper p-4">
            <p className="eyebrow text-2xs mb-1">Thông tin sách cần bán</p>
            {book ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-ink">{book.title}</p>
                  <p className="text-xs text-ink-mute">{book.author}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xs text-ink-mute">Giá thu mua ước tính</p>
                  <p className="font-bold text-forest text-base num">{formatMoney(estimated)}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Tên sách" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} required />
                <TextField label="Tác giả" value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
            )}

            <div className="mt-3">
              <span className="label">Tình trạng sách hiện tại:</span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(['likenew', 'used'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={`border p-2.5 text-left text-xs ${
                      condition === c ? 'border-ink bg-card font-semibold' : 'border-rule hover:border-ink-mute'
                    }`}
                  >
                    <span>{c === 'likenew' ? 'Như mới · 98%' : 'Đã qua sử dụng · 90%'}</span>
                    <span className="block mt-0.5 text-forest num">
                      {book ? formatMoney(buybackQuote(book, c)) : (c === 'likenew' ? '45% giá bìa' : '30% giá bìa')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Họ và tên bạn" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField label="Số điện thoại" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <TextField label="Email (để nhận thông báo)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField label="Ghi chú về tình trạng sách" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Bọc bìa nilon, giấy hơi ngả vàng..." />
            <TextField className="sm:col-span-2" label="Địa chỉ lấy sách tận nhà" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" required />
          </div>

          <div className="border-t border-rule pt-4">
            <p className="eyebrow text-2xs mb-2">Tài khoản ngân hàng nhận tiền chuyển khoản</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField label="Ngân hàng" value={bankName} onChange={(e) => setBankName(e.target.value)}>
                {['Vietcombank', 'MB Bank', 'Techcombank', 'BIDV', 'VietinBank', 'ACB', 'TPBank', 'VPBank'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </SelectField>
              <TextField label="Số tài khoản" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} required />
              <TextField label="Tên chủ tài khoản" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="IN HOA KHONG DAU" required />
            </div>
          </div>

          <div>
            <span className="label">Ảnh chụp thực tế sách (tuỳ chọn):</span>
            <div className="mt-1 flex items-center gap-3">
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-xs file:btn-ghost file:btn-sm file:mr-2" />
              {photo && (
                <img src={photo} alt="Xem trước" className="h-10 w-10 object-cover border border-rule" />
              )}
            </div>
          </div>

          {error && <p className="text-sm text-terra">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-rule pt-4">
            <button type="button" onClick={onClose} className="btn-ghost">
              Huỷ
            </button>
            <button type="submit" className="btn-ink">
              Gửi yêu cầu thu mua
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
