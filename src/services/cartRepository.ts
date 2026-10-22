import type { CartItem } from '../models/types'
import { persistentStore } from './store'

export const cartStore = persistentStore<CartItem[]>('cart', () => [])
export const couponStore = persistentStore<string[]>('coupons', () => [])

export const cartRepository = {
  items: () => cartStore.get(),
  save: (items: CartItem[]) => cartStore.set(items),
  coupons: () => couponStore.get(),
  saveCoupons: (codes: string[]) => couponStore.set(codes),
  clear() {
    cartStore.set([])
    couponStore.set([])
  },
}
