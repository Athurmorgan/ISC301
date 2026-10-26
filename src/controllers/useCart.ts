import { useMemo } from 'react'
import { CONDITIONS, SHIPPING } from '../data/catalog'
import * as cart from '../models/cart'
import { offersFor } from '../models/listing'
import type { Book, Listing, Result, ShippingId } from '../models/types'
import { cartRepository, cartStore, couponStore } from '../services/cartRepository'
import { couponRepository, couponsStore } from '../services/couponRepository'
import { catalogStore, listingRepository, listingsStore } from '../services/listingRepository'
import { notify, notifyError } from '../services/toastService'
import { userRepository } from '../services/userRepository'
import { useStore } from './useStore'

export function useCart(shippingId: ShippingId = 'standard') {
  const items = useStore(cartStore)
  const codes = useStore(couponStore)
  const books = useStore(catalogStore)
  const listings = useStore(listingsStore)
  const coupons = useStore(couponsStore)

  const totals = useMemo(() => {
    const shipping = SHIPPING.find((s) => s.id === shippingId) ?? SHIPPING[0]
    return cart.computeTotals(cart.buildLines(items, books, listings), codes, shipping, coupons)
  }, [items, codes, books, listings, shippingId, coupons])

  /** Thêm sách từ một tin đăng cụ thể */
  function addListing(listing: Listing, qty = 1, silent = false): boolean {
    const result = cart.addItem(cartRepository.items(), listing, qty, userRepository.sessionEmail())
    if (!result.ok) {
      notifyError(result.error)
      return false
    }
    cartRepository.save(result.value)
    if (!silent) {
      const book = books.find((b) => b.id === listing.bookId)
      notify(`Đã thêm “${book?.title ?? 'sách'}” (${CONDITIONS[listing.condition].label.toLowerCase()}, ${listing.sellerName})`, {
        action: { label: 'Xem giỏ', to: '/gio-hang' },
      })
    }
    return true
  }

  /** Nút "thêm nhanh" trên thẻ sách: lấy tin rẻ nhất còn chỗ trong giỏ */
  function add(book: Book, qty = 1, silent = false): boolean {
    const me = userRepository.sessionEmail()
    const current = cartRepository.items()
    const offer = offersFor(listingRepository.all(), book.id).find(
      (l) => l.sellerId !== me && cart.quantityInCart(current, l.id) + qty <= l.qty,
    )
    if (!offer) {
      notifyError(book.stock ? 'Bạn đã cho hết số sách đang bán vào giỏ' : 'Sách tạm hết, chưa có ai đăng bán')
      return false
    }
    return addListing(offer, qty, silent)
  }

  function setQty(listingId: string, qty: number) {
    const listing = listingRepository.find(listingId)
    if (listing) cartRepository.save(cart.setItemQty(cartRepository.items(), listing, qty))
  }

  function applyCoupon(code: string): Result<string[]> {
    const result = cart.applyCoupon(couponRepository.all(), cartRepository.coupons(), code, totals.subtotal)
    if (result.ok) cartRepository.saveCoupons(result.value)
    return result
  }

  const removeCoupon = (code: string) => cartRepository.saveCoupons(cartRepository.coupons().filter((c) => c !== code))

  return { items, totals, count: totals.itemCount, codes, add, addListing, setQty, applyCoupon, removeCoupon, clear: cartRepository.clear }
}

/** Số lượng sách trong giỏ — dùng cho huy hiệu trên header */
export function useCartCount() {
  const items = useStore(cartStore)
  return items.reduce((s, i) => s + i.qty, 0)
}
