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
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
    updateProfile(patch: { name: string; phone: string; address: Partial<Address> }) {
      if (user && user.role === 'customer') userRepository.update(user.email, patch)
    },
  }
}
