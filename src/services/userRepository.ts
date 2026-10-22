import { ADMIN_ACCOUNT } from '../data/catalog'
import type { User } from '../models/types'
import { persistentStore } from './store'

export const usersStore = persistentStore<User[]>('users', () => [])
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

export const userRepository = {
  find: (email: string) => (email === ADMIN.email ? ADMIN : usersStore.get().find((u) => u.email === email)),
  insert: (user: User) => usersStore.set((list) => [...list, user]),
  update: (email: string, patch: Partial<User>) => usersStore.set((list) => list.map((u) => (u.email === email ? { ...u, ...patch } : u))),
  sessionEmail: () => sessionStore.get(),
  setSession: (email: string | null) => sessionStore.set(email),
}
