import { PROVINCES } from '../data/catalog'
import type { Address } from './types'

export type Errors<T> = Partial<Record<keyof T, string>>

export const hasErrors = (e: object) => Object.values(e).some(Boolean)

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())

/** Số di động Việt Nam: 10 số, đầu 03/05/07/08/09 (chấp nhận +84) */
export const isVietnamesePhone = (s: string) => /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(s.replace(/[\s.-]/g, ''))

export function validateAddress(a: Address): Errors<Address> {
  const e: Errors<Address> = {}
  if (a.name.trim().length < 2) e.name = 'Nhập họ tên người nhận'
  if (!isVietnamesePhone(a.phone)) e.phone = 'Số điện thoại chưa đúng (10 số, vd. 0912 345 678)'
  if (a.email && !isEmail(a.email)) e.email = 'Email chưa đúng định dạng'
  if (!PROVINCES[a.province]) e.province = 'Chọn tỉnh/thành'
  if (!PROVINCES[a.province]?.includes(a.district)) e.district = 'Chọn quận/huyện'
  if (a.street.trim().length < 5) e.street = 'Nhập số nhà, tên đường'
  return e
}

/** Thuật toán Luhn kiểm tra số thẻ */
export function luhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

export interface CardInput {
  number: string
  holder: string
  expiry: string
  cvv: string
}

export function validateCard(c: CardInput, now = new Date()): Errors<CardInput> {
  const e: Errors<CardInput> = {}
  if (!luhn(c.number)) e.number = 'Số thẻ không hợp lệ'
  if (c.holder.trim().length < 3) e.holder = 'Nhập tên in trên thẻ'
  const m = /^(\d{2})\/(\d{2})$/.exec(c.expiry.trim())
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) e.expiry = 'Định dạng MM/YY'
  else {
    const end = new Date(2000 + Number(m[2]), Number(m[1]), 1)
    if (end <= now) e.expiry = 'Thẻ đã hết hạn'
  }
  if (!/^\d{3,4}$/.test(c.cvv)) e.cvv = '3 hoặc 4 số'
  return e
}

export const DEMO_OTP = '123456'
