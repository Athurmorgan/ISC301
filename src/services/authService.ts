import { fail, ok } from '../models/result'
import type { Result, User } from '../models/types'
import { isEmail, isVietnamesePhone } from '../models/validation'
import { API_ENABLED, api, errorMessage, isNetworkError, tokenStore, type ApiUser } from './apiClient'
import { markOffline } from './syncService'
import { hashPassword, userRepository } from './userRepository'

export interface RegisterInput {
  name: string
  email: string
  phone: string
  password: string
}

export function register(input: RegisterInput): Result<User> {
  const email = input.email.trim().toLowerCase()
  if (input.name.trim().length < 2) return fail('Nhập họ tên')
  if (!isEmail(email)) return fail('Email chưa đúng định dạng')
  if (!isVietnamesePhone(input.phone)) return fail('Số điện thoại chưa đúng')
  if (input.password.length < 6) return fail('Mật khẩu cần ít nhất 6 ký tự')
  if (userRepository.find(email)) return fail('Email này đã được đăng ký')

  const user: User = {
    email,
    name: input.name.trim(),
    phone: input.phone.trim(),
    passwordHash: hashPassword(input.password),
    role: 'customer',
    address: { name: input.name.trim(), phone: input.phone.trim(), email },
    createdAt: new Date().toISOString(),
  }
  userRepository.insert(user)
  userRepository.setSession(email)
  return ok(user)
}

export function login(emailInput: string, password: string): Result<User> {
  const user = userRepository.find(emailInput.trim().toLowerCase())
  if (!user || user.passwordHash !== hashPassword(password)) return fail('Email hoặc mật khẩu không đúng')
  userRepository.setSession(user.email)
  return ok(user)
}

export function changePassword(email: string, oldPass: string, newPass: string): Result<undefined> {
  const user = userRepository.find(email.trim().toLowerCase())
  if (!user) return fail('Không tìm thấy tài khoản')
  if (user.passwordHash !== hashPassword(oldPass)) return fail('Mật khẩu cũ không chính xác')
  if (newPass.length < 6) return fail('Mật khẩu mới cần ít nhất 6 ký tự')
  userRepository.update(user.email, { passwordHash: hashPassword(newPass) })
  return ok(undefined)
}

export function resetPassword(email: string, otp: string, newPass: string): Result<undefined> {
  const cleanEmail = email.trim().toLowerCase()
  const user = userRepository.find(cleanEmail)
  if (!user) return fail('Email này chưa được đăng ký trong hệ thống')
  if (otp.trim() !== '123456') return fail('Mã OTP không đúng (Mã demo: 123456)')
  if (newPass.length < 6) return fail('Mật khẩu mới cần ít nhất 6 ký tự')
  userRepository.update(cleanEmail, { passwordHash: hashPassword(newPass) })
  return ok(undefined)
}

export const logout = () => {
  tokenStore.set(null)
  userRepository.setSession(null)
}

/** Lưu bản sao tài khoản máy chủ vào máy để các trang dùng chung một nguồn hồ sơ */
function mirror(remote: ApiUser, password: string): User {
  const existing = userRepository.find(remote.email)
  const user: User = {
    email: remote.email,
    name: remote.name,
    phone: remote.phone ?? '',
    passwordHash: hashPassword(password),
    role: remote.role === 'admin' ? 'admin' : 'customer',
    address: { ...existing?.address, ...remote.address, name: remote.name, phone: remote.phone, email: remote.email },
    createdAt: remote.createdAt ?? new Date().toISOString(),
  }
  // Tài khoản quản trị mặc định đã có sẵn trong mã, không ghi đè
  if (existing && existing.role !== 'admin') userRepository.update(user.email, user)
  else if (!existing) userRepository.insert(user)
  return userRepository.find(user.email) ?? user
}

/**
 * Đăng nhập qua máy chủ để nhận JWT. Máy chủ không phản hồi thì dùng tài khoản đã lưu trên máy;
 * máy chủ từ chối thì vẫn thử tài khoản cục bộ (tạo khi chạy offline trước đó).
 */
export async function loginOnline(email: string, password: string): Promise<Result<User>> {
  if (!API_ENABLED) return login(email, password)
  try {
    const { token, user } = await api.auth.login(email.trim().toLowerCase(), password)
    tokenStore.set(token)
    const local = mirror(user, password)
    userRepository.setSession(local.email)
    return ok(local)
  } catch (e) {
    if (isNetworkError(e)) markOffline()
    tokenStore.set(null)
    const local = login(email, password)
    return local.ok || isNetworkError(e) ? local : fail(errorMessage(e))
  }
}

export async function registerOnline(input: RegisterInput): Promise<Result<User>> {
  if (!API_ENABLED) return register(input)
  try {
    const { token, user } = await api.auth.register({ ...input, email: input.email.trim().toLowerCase() })
    tokenStore.set(token)
    const local = mirror(user, input.password)
    userRepository.setSession(local.email)
    return ok(local)
  } catch (e) {
    if (!isNetworkError(e)) return fail(errorMessage(e))
    markOffline()
    return register(input)
  }
}
