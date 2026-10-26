// Kiểm tra hồ sơ đăng ký bán sách. Người bán phải định danh bằng CCCD và tài khoản ngân hàng
// đứng tên chính mình để BookWise đối soát tiền và xử lý khi có tranh chấp.

import { normalize } from './format'
import { isVietnamesePhone, type Errors } from './validation'

export interface SellerForm {
  fullName: string
  phone: string
  idNumber: string
  idPhoto: string
  studentCardPhoto: string
  school: string
  pickupAddress: string
  bankName: string
  bankAccount: string
  accountHolder: string
  agree: boolean
}

export const emptySellerForm = (name = '', phone = ''): SellerForm => ({
  fullName: name,
  phone,
  idNumber: '',
  idPhoto: '',
  studentCardPhoto: '',
  school: '',
  pickupAddress: '',
  bankName: '',
  bankAccount: '',
  accountHolder: '',
  agree: false,
})

/** Bỏ dấu, viết hoa: "Trần Thu Hà" → "TRAN THU HA" (cách ngân hàng in tên chủ tài khoản) */
export const bankName = (s: string) => normalize(s).toUpperCase().replace(/\s+/g, ' ').trim()

export function validateSellerForm(f: SellerForm): Errors<SellerForm> {
  const e: Errors<SellerForm> = {}
  if (f.fullName.trim().split(/\s+/).length < 2) e.fullName = 'Nhập họ tên đầy đủ như trên CCCD'
  if (!isVietnamesePhone(f.phone)) e.phone = 'Số điện thoại chưa đúng'
  if (!/^0\d{11}$/.test(f.idNumber.trim())) e.idNumber = 'Số CCCD gồm 12 chữ số, bắt đầu bằng 0'
  if (!f.idPhoto) e.idPhoto = 'Tải ảnh mặt trước CCCD'
  if (f.studentCardPhoto && f.school.trim().length < 3) e.school = 'Nhập tên trường trên thẻ sinh viên'
  if (f.pickupAddress.trim().length < 8) e.pickupAddress = 'Nhập địa chỉ để BookWise đến lấy sách'
  if (f.bankName.trim().length < 2) e.bankName = 'Nhập tên ngân hàng'
  if (!/^\d{6,19}$/.test(f.bankAccount.replace(/\s/g, ''))) e.bankAccount = 'Số tài khoản 6–19 chữ số'
  if (!f.accountHolder.trim()) e.accountHolder = 'Nhập tên chủ tài khoản'
  else if (bankName(f.accountHolder) !== bankName(f.fullName)) e.accountHolder = 'Tài khoản phải đứng tên chính bạn'
  if (!f.agree) e.agree = 'Bạn cần đồng ý quy định người bán'
  return e
}

/** Che số CCCD khi hiển thị: 079204001234 → 0792••••1234 */
export const maskId = (id: string) => (id.length > 8 ? `${id.slice(0, 4)}${'•'.repeat(id.length - 8)}${id.slice(-4)}` : id)
