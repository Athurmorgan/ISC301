import { SEED_BOOKS } from '../data/books'
import type { Book } from '../models/types'
import { persistentStore } from './store'

/**
 * Thông tin đầu sách (tên, tác giả, giá bìa...). Giá bán và số cuốn còn lại không nằm ở đây
 * mà tính từ các tin đăng — xem catalogStore trong listingRepository.
 */
export const booksStore = persistentStore<Book[]>('books', () => SEED_BOOKS.map((b) => ({ ...b })))

export const bookRepository = {
  all: () => booksStore.get(),

  find: (id: string) => booksStore.get().find((b) => b.id === id),

  save(book: Book) {
    booksStore.set((list) => (list.some((b) => b.id === book.id) ? list.map((b) => (b.id === book.id ? book : b)) : [book, ...list]))
  },

  remove(id: string) {
    booksStore.set((list) => list.filter((b) => b.id !== id))
  },

  addRating(id: string, star: number) {
    booksStore.set((list) =>
      list.map((b) => {
        if (b.id !== id) return b
        const count = b.ratingCount || 0
        const current = b.rating || 0
        const nextCount = count + 1
        const nextRating = Math.round(((current * count + star) / nextCount) * 10) / 10
        return { ...b, ratingCount: nextCount, rating: nextRating }
      }),
    )
  },
}
