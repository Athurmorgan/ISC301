import { persistentStore } from './store'
import type { BuybackRequest, BuybackStatus } from '../models/types'

const SEED_BUYBACKS: BuybackRequest[] = [
  {
    code: 'BB-849201',
    createdAt: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString(),
    bookTitle: 'Tư Duy Nhanh Và Chậm',
    author: 'Daniel Kahneman',
    condition: 'likenew',
    estimatedPrice: 99000,
    customerName: 'Hoàng Minh Tuấn',
    phone: '0903123456',
    email: 'tuan.hoang@gmail.com',
    address: '45 Lê Duẩn, Quận 1, TP. Hồ Chí Minh',
    bankName: 'MB Bank',
    bankAccount: '9704220123456',
    accountHolder: 'HOANG MINH TUAN',
    note: 'Sách còn bọc màng co nilon bảo quản rất kỹ, không có nếp gấp.',
    status: 'paid',
    history: [
      { status: 'pending', at: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString(), note: 'Đã gửi yêu cầu thu mua' },
      { status: 'collecting', at: new Date(Date.now() - 3600 * 24 * 1.5 * 1000).toISOString(), note: 'Bưu tá BookWise đang đến lấy sách tận nhà' },
      { status: 'inspecting', at: new Date(Date.now() - 3600 * 24 * 1 * 1000).toISOString(), note: 'Đã nhận sách tại kho, chuyên viên đang kiểm tra trang và gáy' },
      { status: 'paid', at: new Date(Date.now() - 3600 * 24 * 0.5 * 1000).toISOString(), note: 'Kiểm định hoàn tất: Sách đạt chuẩn 98%. Đã chuyển khoản 99.000đ.' },
    ],
  },
]

export const buybacksStore = persistentStore<BuybackRequest[]>('buybacks', () => SEED_BUYBACKS)

export const BUYBACK_STATUS_LABEL: Record<BuybackStatus, string> = {
  pending: 'Chờ tiếp nhận',
  collecting: 'Đang đến lấy sách',
  inspecting: 'Đang kiểm định',
  paid: 'Đã thanh toán',
  rejected: 'Từ chối thu mua',
}

export const buybackRepository = {
  all: () => buybacksStore.get(),
  find: (code: string) => buybacksStore.get().find((b) => b.code === code.trim().toUpperCase()),
  byPhone: (phone: string) => {
    const p = phone.replace(/\D/g, '').replace(/^84/, '0')
    return buybacksStore.get().filter((b) => b.phone.replace(/\D/g, '').replace(/^84/, '0') === p)
  },
  byEmail: (email: string) => buybacksStore.get().filter((b) => b.email?.toLowerCase() === email.trim().toLowerCase()),
  insert(request: BuybackRequest) {
    buybacksStore.set((list) => [request, ...list])
  },
  updateStatus(code: string, status: BuybackStatus, note: string) {
    buybacksStore.set((list) =>
      list.map((b) => {
        if (b.code !== code) return b
        return {
          ...b,
          status,
          history: [...b.history, { status, at: new Date().toISOString(), note }],
        }
      }),
    )
  },
}
