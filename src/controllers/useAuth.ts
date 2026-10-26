import type { Address } from '../models/types'
import * as auth from '../services/authService'
import { sessionStore, userRepository, usersStore } from '../services/userRepository'
import { useStore } from './useStore'

export function useAuth() {
  const email = useStore(sessionStore)
  useStore(usersStore) // render lại khi hồ sơ người dùng thay đổi
  const user = email ? (userRepository.find(email) ?? null) : null

  return {
    user,
    isAdmin: user?.role === 'admin',
    login: auth.loginOnline,
    register: auth.registerOnline,
    logout: auth.logout,
    changePassword(oldPass: string, newPass: string) {
      if (!user) return { ok: false, error: 'Chưa đăng nhập' } as const
      return auth.changePassword(user.email, oldPass, newPass)
    },
    resetPassword: auth.resetPassword,
    updateProfile(patch: { name: string; phone: string; address: Partial<Address> }) {
      if (user && user.role === 'customer') userRepository.update(user.email, patch)
    },
  }
}
