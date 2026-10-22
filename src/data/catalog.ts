import type {
  Category,
  CategoryId,
  Condition,
  ConditionId,
  Coupon,
  OrderStatus,
  PaymentMethod,
  ShippingMethod,
  TicketTopic,
} from '../models/types'

export const CATEGORIES: Category[] = [
  { id: 'kinh-te', name: 'Kinh tế', blurb: 'Đầu tư, quản trị, khởi nghiệp' },
  { id: 'ky-nang', name: 'Kỹ năng & tâm lý', blurb: 'Thói quen, tư duy, đời sống' },
  { id: 'van-hoc', name: 'Văn học', blurb: 'Tiểu thuyết kinh điển và đương đại' },
  { id: 'khoa-hoc', name: 'Lịch sử & khoa học', blurb: 'Vũ trụ, sự sống, loài người' },
]

export const categoryName = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.name ?? id

export const CONDITIONS: Record<ConditionId, Condition> = {
  seal: { id: 'seal', label: 'Mới, nguyên seal', note: 'Sách mới từ nhà phát hành', factor: 1 },
  likenew: { id: 'likenew', label: 'Như mới · 98%', note: 'Đọc một lần, không ghi chú, gáy thẳng', factor: 0.8 },
  used: { id: 'used', label: 'Đã qua sử dụng · 90%', note: 'Có thể ngả màu nhẹ, nội dung đầy đủ', factor: 0.6 },
}

export const CONDITION_ORDER: ConditionId[] = ['seal', 'likenew', 'used']

export const COUPONS: Coupon[] = [
  { code: 'BOOKWISE50K', kind: 'fixed', value: 50_000, minSubtotal: 200_000, description: 'Giảm 50.000đ cho đơn từ 200.000đ' },
  { code: 'GIAM10', kind: 'percent', value: 10, cap: 30_000, minSubtotal: 100_000, description: 'Giảm 10%, tối đa 30.000đ, đơn từ 100.000đ' },
  { code: 'FREESHIP15K', kind: 'shipping', value: 15_000, minSubtotal: 150_000, description: 'Giảm 15.000đ phí giao hàng, đơn từ 150.000đ' },
]

export const PROVINCES: Record<string, string[]> = {
  'Hà Nội': ['Ba Đình', 'Hoàn Kiếm', 'Đống Đa', 'Hai Bà Trưng', 'Cầu Giấy', 'Thanh Xuân', 'Tây Hồ', 'Hà Đông'],
  'TP. Hồ Chí Minh': ['Quận 1', 'Quận 3', 'Quận 7', 'Quận 10', 'Bình Thạnh', 'Phú Nhuận', 'Tân Bình', 'TP. Thủ Đức'],
  'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu'],
  'Hải Phòng': ['Hồng Bàng', 'Lê Chân', 'Ngô Quyền', 'Hải An'],
  'Cần Thơ': ['Ninh Kiều', 'Bình Thủy', 'Cái Răng'],
}

export const SHIPPING: ShippingMethod[] = [
  { id: 'standard', name: 'Giao tiêu chuẩn', fee: 15_000, eta: '2–3 ngày làm việc', carrier: 'GHN / Viettel Post' },
  {
    id: 'express',
    name: 'Hỏa tốc 2 giờ',
    fee: 30_000,
    eta: 'Trong 120 phút kể từ khi xác nhận',
    carrier: 'AhaMove',
    provinces: ['Hà Nội', 'TP. Hồ Chí Minh'],
  },
]

export const PAYMENTS: PaymentMethod[] = [
  { id: 'vietqr', name: 'Chuyển khoản VietQR', detail: 'Quét mã bằng ứng dụng ngân hàng bất kỳ' },
  { id: 'ewallet', name: 'Ví MoMo / ZaloPay', detail: 'Xác nhận trên ứng dụng ví' },
  { id: 'card', name: 'Thẻ ATM / Visa / Mastercard', detail: 'Xác thực bằng mã OTP' },
  { id: 'cod', name: 'Thanh toán khi nhận hàng', detail: 'Kiểm tra sách trước khi trả tiền' },
]

/** Tài khoản nhận tiền giả lập để tạo mã VietQR */
export const BANK = { bin: '970422', accountNo: '0123456789', accountName: 'BOOKWISE DEMO', bankName: 'MB Bank' }

export const ORDER_FLOW: OrderStatus[] = ['pending', 'confirmed', 'shipping', 'delivered']

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
}

export const STATUS_HINT: Record<OrderStatus, string> = {
  pending: 'BookWise đang kiểm tra tồn kho và thanh toán',
  confirmed: 'Sách đã qua kiểm định và được đóng gói',
  shipping: 'Đơn vị vận chuyển đang giao sách đến bạn',
  delivered: 'Bạn đã nhận được sách',
  cancelled: 'Đơn hàng đã bị huỷ, tồn kho đã được hoàn lại',
}

export const TICKET_TOPICS: Record<TicketTopic, string> = {
  order: 'Đơn hàng & giao nhận',
  quality: 'Chất lượng sách',
  payment: 'Thanh toán & hoàn tiền',
  buyback: 'Bán lại sách cũ',
  other: 'Khác',
}

export const ADMIN_ACCOUNT = { email: 'admin@bookwise.vn', password: 'admin123', name: 'Quản trị viên' }

/** Giá thu mua sách cũ = giá bán bản mới × hệ số */
export const BUYBACK_RATE: Record<Exclude<ConditionId, 'seal'>, number> = {
  likenew: 0.45,
  used: 0.3,
}
