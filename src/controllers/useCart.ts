import { useMemo } from 'react'
import { CONDITIONS, SHIPPING } from '../data/catalog'
import * as cart from '../models/cart'
import type { Book, ConditionId, Result, ShippingId } from '../models/types'
import { booksStore } from '../services/bookRepository'
import { cartRepository, cartStore, couponStore } from '../services/cartRepository'
import { notify, notifyError } from '../services/toastService'
import { useStore } from './useStore'

export function useCart(shippingId: ShippingId = 'standard') {
  const items = useStore(cartStore)
  const codes = useStore(couponStore)
  const books = useStore(booksStore)

  const totals = useMemo(() => {
    const shipping = SHIPPING.find((s) => s.id === shippingId) ?? SHIPPING[0]
    return cart.computeTotals(cart.buildLines(items, books), codes, shipping)
  }, [items, codes, books, shippingId])

  function add(book: Book, condition: ConditionId = 'seal', qty = 1, silent = false): boolean {
    const result = cart.addItem(cartRepository.items(), book, condition, qty)
    if (!result.ok) {
      notifyError(result.error)
      return false
    }
    cartRepository.save(result.value)
    if (!silent) {
      notify(`Đã thêm “${book.title}” (${CONDITIONS[condition].label.toLowerCase()})`, { action: { label: 'Xem giỏ', to: '/gio-hang' } })
    }
    return true
  }

  const setQty = (book: Book, condition: ConditionId, qty: number) =>
    cartRepository.save(cart.setItemQty(cartRepository.items(), book, condition, qty))

  function applyCoupon(code: string): Result<string[]> {
    const result = cart.applyCoupon(cartRepository.coupons(), code, totals.subtotal)
    if (result.ok) cartRepository.saveCoupons(result.value)
    return result
  }

  const removeCoupon = (code: string) => cartRepository.saveCoupons(cartRepository.coupons().filter((c) => c !== code))

  return { items, totals, count: totals.itemCount, codes, add, setQty, applyCoupon, removeCoupon, clear: cartRepository.clear }
}

/** Số lượng sách trong giỏ — dùng cho huy hiệu trên header */
export function useCartCount() {
  const items = useStore(cartStore)
  return items.reduce((s, i) => s + i.qty, 0)
}
