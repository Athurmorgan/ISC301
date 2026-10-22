import type { Order } from '../models/types'
import { persistentStore } from './store'

export const ordersStore = persistentStore<Order[]>('orders', () => [])

const normalizeCode = (code: string) => code.trim().toUpperCase()
const digits = (s: string) => s.replace(/\D/g, '').replace(/^84/, '0')

export const orderRepository = {
  all: () => ordersStore.get(),
  find: (code: string) => ordersStore.get().find((o) => o.code === normalizeCode(code)),
  byPhone: (phone: string) => ordersStore.get().filter((o) => digits(o.customer.phone) === digits(phone)),
  byEmail: (email: string) => ordersStore.get().filter((o) => o.userEmail === email),
  insert: (order: Order) => ordersStore.set((list) => [order, ...list]),
  update: (code: string, patch: (o: Order) => Order) => ordersStore.set((list) => list.map((o) => (o.code === code ? patch(o) : o))),
}
