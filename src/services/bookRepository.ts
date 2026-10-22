import { SEED_BOOKS } from '../data/books'
import { fail, ok } from '../models/result'
import type { Book, OrderItem, Result } from '../models/types'
import { persistentStore } from './store'

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

  adjustStock(id: string, delta: number) {
    booksStore.set((list) => list.map((b) => (b.id === id ? { ...b, stock: Math.max(0, b.stock + delta) } : b)))
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

  /** Trừ kho khi đặt hàng; thất bại nếu một đầu sách không đủ hàng. */
  reserve(items: Pick<OrderItem, 'bookId' | 'qty' | 'title'>[]): Result<undefined> {
    const list = booksStore.get()
    const need = new Map<string, number>()
    items.forEach((i) => need.set(i.bookId, (need.get(i.bookId) ?? 0) + i.qty))
    for (const [id, qty] of need) {
      const book = list.find((b) => b.id === id)
      if (!book || book.stock < qty) return fail(`“${book?.title ?? id}” không còn đủ hàng`)
    }
    booksStore.set(list.map((b) => (need.has(b.id) ? { ...b, stock: b.stock - need.get(b.id)!, sold: b.sold + need.get(b.id)! } : b)))
    return ok(undefined)
  },

  /** Hoàn kho khi huỷ đơn */
  release(items: Pick<OrderItem, 'bookId' | 'qty'>[]) {
    booksStore.set((list) =>
      list.map((b) => {
        const qty = items.filter((i) => i.bookId === b.id).reduce((s, i) => s + i.qty, 0)
        return qty ? { ...b, stock: b.stock + qty, sold: Math.max(0, b.sold - qty) } : b
      }),
    )
  },
}
