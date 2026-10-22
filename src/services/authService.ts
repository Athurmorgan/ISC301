import { fail, ok } from '../models/result'
import type { Result, User } from '../models/types'
import { isEmail, isVietnamesePhone } from '../models/validation'
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

export const logout = () => userRepository.setSession(null)
