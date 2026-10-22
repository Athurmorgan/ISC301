import { persistentStore } from './store'

export const wishlistStore = persistentStore<string[]>('wishlist', () => [])

export const wishlistRepository = {
  all: () => wishlistStore.get(),
  has: (bookId: string) => wishlistStore.get().includes(bookId),
  toggle(bookId: string): boolean {
    const list = wishlistStore.get()
    const exists = list.includes(bookId)
    if (exists) {
      wishlistStore.set(list.filter((id) => id !== bookId))
      return false
    } else {
      wishlistStore.set([...list, bookId])
      return true
    }
  },
  remove(bookId: string) {
    wishlistStore.set((list) => list.filter((id) => id !== bookId))
  },
  clear() {
    wishlistStore.set([])
  },
}
