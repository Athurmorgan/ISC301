import { useMemo } from 'react'
import { generateCode } from '../models/order'
import { fail, ok } from '../models/result'
import type { Result, Review, Ticket, TicketTopic } from '../models/types'
import { isEmail, isVietnamesePhone } from '../models/validation'
import { reviewRepository, reviewsStore, ticketRepository, ticketsStore } from '../services/feedbackRepository'
import { orderRepository, ordersStore } from '../services/orderRepository'
import { bookRepository } from '../services/bookRepository'
import { sessionStore } from '../services/userRepository'
import { useStore } from './useStore'

export function useAllReviews() {
  const all = useStore(reviewsStore)
  return {
    reviews: all,
    remove: (at: string) => reviewRepository.delete(at),
  }
}

export function useReviews(bookId: string) {
  const all = useStore(reviewsStore)
  const orders = useStore(ordersStore)
  const sessionEmail = useStore(sessionStore)
  const reviews = useMemo(() => all.filter((r) => r.bookId === bookId), [all, bookId])

  // Người dùng đã mua cuốn sách này hay chưa?
  const hasPurchased = useMemo(() => {
    if (!sessionEmail) return false
    return orders
      .filter((o) => o.userEmail === sessionEmail)
      .some((o) => o.status !== 'cancelled' && o.items.some((i) => i.bookId === bookId))
  }, [sessionEmail, bookId, orders])

  function add(input: Omit<Review, 'bookId' | 'at' | 'verifiedPurchase'>): Result<undefined> {
    if (input.name.trim().length < 2) return fail('Nhập tên của bạn')
    if (input.rating < 1 || input.rating > 5) return fail('Chọn số sao')
    if (input.body.trim().length < 10) return fail('Nhận xét cần ít nhất 10 ký tự')
    
    reviewRepository.insert({
      ...input,
      name: input.name.trim(),
      body: input.body.trim(),
      bookId,
      at: new Date().toISOString(),
      verifiedPurchase: hasPurchased,
    })
    bookRepository.addRating(bookId, input.rating)
    return ok(undefined)
  }
  return { reviews, add, hasPurchased }
}

export interface TicketInput {
  topic: TicketTopic
  name: string
  email: string
  phone: string
  orderCode: string
  message: string
  attachment?: string
}

export type TicketErrors = Partial<Record<keyof TicketInput, string>>

export function validateTicket(t: TicketInput): TicketErrors {
  const e: TicketErrors = {}
  if (t.name.trim().length < 2) e.name = 'Nhập họ tên'
  if (!isEmail(t.email)) e.email = 'Email chưa đúng định dạng'
  if (t.phone && !isVietnamesePhone(t.phone)) e.phone = 'Số điện thoại chưa đúng'
  if (t.orderCode && !orderRepository.find(t.orderCode)) e.orderCode = 'Không tìm thấy mã đơn này'
  if (t.message.trim().length < 20) e.message = 'Mô tả cần ít nhất 20 ký tự để chúng tôi hỗ trợ chính xác'
  return e
}

export function useTickets() {
  const tickets = useStore(ticketsStore)
  return {
    tickets,
    create(input: TicketInput): Ticket {
      const ticket: Ticket = {
        ...input,
        orderCode: input.orderCode.trim().toUpperCase(),
        code: generateCode('CS', 5, ticketRepository.exists),
        status: 'open',
        at: new Date().toISOString(),
      }
      ticketRepository.insert(ticket)
      return ticket
    },
    toggle: (t: Ticket) => ticketRepository.update(t.code, { status: t.status === 'open' ? 'resolved' : 'open' }),
  }
}
