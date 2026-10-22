import type { Review, Ticket } from '../models/types'
import { persistentStore } from './store'

export const reviewsStore = persistentStore<Review[]>('reviews', () => [])
export const ticketsStore = persistentStore<Ticket[]>('tickets', () => [])

export const reviewRepository = {
  forBook: (bookId: string) => reviewsStore.get().filter((r) => r.bookId === bookId),
  insert: (review: Review) => reviewsStore.set((list) => [review, ...list]),
}

export const ticketRepository = {
  all: () => ticketsStore.get(),
  exists: (code: string) => ticketsStore.get().some((t) => t.code === code),
  insert: (ticket: Ticket) => ticketsStore.set((list) => [ticket, ...list]),
  update: (code: string, patch: Partial<Ticket>) => ticketsStore.set((list) => list.map((t) => (t.code === code ? { ...t, ...patch } : t))),
}
