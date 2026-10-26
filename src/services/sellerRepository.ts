import { DEMO_SELLER } from '../data/catalog'
import type { SellerApplication, SellerStatus } from '../models/types'
import { persistentStore } from './store'

const DEMO_APPLICATION: SellerApplication = {
  email: DEMO_SELLER.email,
  fullName: DEMO_SELLER.name,
  phone: DEMO_SELLER.phone,
  idNumber: '079204001234',
  idPhoto: '',
  school: DEMO_SELLER.school,
  pickupAddress: 'KTX khu B, Dĩ An, Bình Dương',
  bankName: 'MB Bank',
  bankAccount: '0912345678',
  accountHolder: 'TRAN THU HA',
  status: 'approved',
  submittedAt: '2024-12-20T08:00:00.000Z',
  reviewedAt: '2024-12-21T09:30:00.000Z',
  history: [
    { status: 'pending', at: '2024-12-20T08:00:00.000Z', note: 'Gửi hồ sơ đăng ký bán sách' },
    { status: 'approved', at: '2024-12-21T09:30:00.000Z', note: 'Đã đối chiếu CCCD và thẻ sinh viên' },
  ],
}

export const sellersStore = persistentStore<SellerApplication[]>('seller-applications', () => [DEMO_APPLICATION])

export const sellerRepository = {
  all: () => sellersStore.get(),
  find: (email: string) => sellersStore.get().find((a) => a.email === email),
  isApproved: (email: string | null | undefined) => !!email && sellersStore.get().some((a) => a.email === email && a.status === 'approved'),

  /** Gửi mới hoặc gửi lại hồ sơ (sau khi bị từ chối) */
  submit(app: SellerApplication) {
    sellersStore.set((list) => [app, ...list.filter((a) => a.email !== app.email)])
  },

  setStatus(email: string, status: SellerStatus, note: string) {
    const at = new Date().toISOString()
    sellersStore.set((list) =>
      list.map((a) =>
        a.email === email
          ? { ...a, status, reason: status === 'approved' ? undefined : note, reviewedAt: at, history: [...a.history, { status, at, note }] }
          : a,
      ),
    )
  },
}
