import { useMemo } from 'react'
import type { Book } from '../models/types'
import { catalogStore } from '../services/listingRepository'
import { notify } from '../services/toastService'
import { wishlistRepository, wishlistStore } from '../services/wishlistRepository'
import { useStore } from './useStore'

export function useWishlist() {
  const ids = useStore(wishlistStore)
  const books = useStore(catalogStore)

  const wishlistBooks = useMemo(
    () => ids.map((id) => books.find((b) => b.id === id)).filter((b): b is Book => !!b),
    [ids, books],
  )

  function toggle(book: Book) {
    const added = wishlistRepository.toggle(book.id)
    if (added) {
      notify(`Đã lưu “${book.title}” vào danh sách yêu thích`, {
        action: { label: 'Xem yêu thích', to: '/tai-khoan?tab=wishlist' },
      })
    } else {
      notify(`Đã bỏ “${book.title}” khỏi danh sách yêu thích`)
    }
    return added
  }

  return {
    ids,
    wishlistBooks,
    count: ids.length,
    isFavorite: (bookId: string) => ids.includes(bookId),
    toggle,
    remove: wishlistRepository.remove,
    clear: wishlistRepository.clear,
  }
}
