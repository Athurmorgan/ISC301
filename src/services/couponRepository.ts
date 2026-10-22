import { COUPONS } from '../data/catalog'
import type { Coupon } from '../models/types'
import { persistentStore } from './store'

export const couponsStore = persistentStore<Coupon[]>('promo_coupons', () => COUPONS.map((c) => ({ ...c })))

export const couponRepository = {
  all: () => couponsStore.get(),
  find: (code: string) => couponsStore.get().find((c) => c.code === code.trim().toUpperCase()),
  save(coupon: Coupon) {
    const formatted: Coupon = {
      ...coupon,
      code: coupon.code.trim().toUpperCase(),
    }
    couponsStore.set((list) =>
      list.some((c) => c.code === formatted.code)
        ? list.map((c) => (c.code === formatted.code ? formatted : c))
        : [formatted, ...list],
    )
  },
  remove(code: string) {
    couponsStore.set((list) => list.filter((c) => c.code !== code.trim().toUpperCase()))
  },
}
