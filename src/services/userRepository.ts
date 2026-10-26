import { ADMIN_ACCOUNT, DEMO_SELLER } from '../data/catalog'
import type { User } from '../models/types'
import { persistentStore } from './store'

export const sessionStore = persistentStore<string | null>('session', () => null)

/** Băm đơn giản chỉ để không lưu mật khẩu dạng chữ thường trong bản demo — không dùng cho hệ thống thật. */
export const hashPassword = (s: string) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i)
  return `djb2:${(h >>> 0).toString(16)}`
}

const ADMIN: User = {
  email: ADMIN_ACCOUNT.email,
  name: ADMIN_ACCOUNT.name,
  phone: '',
  passwordHash: hashPassword(ADMIN_ACCOUNT.password),
  role: 'admin',
  address: {},
  createdAt: '2024-01-01T00:00:00.000Z',
}

/** Tài khoản sinh viên mẫu đã được duyệt bán sách */
const SELLER: User = {
  email: DEMO_SELLER.email,
  name: DEMO_SELLER.name,
  phone: DEMO_SELLER.phone,
  passwordHash: hashPassword(DEMO_SELLER.password),
  role: 'customer',
  address: { name: DEMO_SELLER.name, phone: DEMO_SELLER.phone, email: DEMO_SELLER.email },
  createdAt: '2024-12-20T08:00:00.000Z',
}

export const usersStore = persistentStore<User[]>('users', () => [SELLER])
if (!usersStore.get().some((u) => u.email === SELLER.email)) usersStore.set((list) => [...list, SELLER])

export const userRepository = {
  find: (email: string) => (email === ADMIN.email ? ADMIN : usersStore.get().find((u) => u.email === email)),
  insert: (user: User) => usersStore.set((list) => [...list, user]),
  update: (email: string, patch: Partial<User>) => usersStore.set((list) => list.map((u) => (u.email === email ? { ...u, ...patch } : u))),
  sessionEmail: () => sessionStore.get(),
  setSession: (email: string | null) => sessionStore.set(email),
}
