import { generateCode } from '../models/order'
import { fail, ok } from '../models/result'
import type { BuybackRequest, BuybackStatus, ConditionId, Result } from '../models/types'
import { isEmail, isVietnamesePhone } from '../models/validation'
import { CONDITIONS } from '../data/catalog'
import { storePrice } from '../models/pricing'
import { bookRepository } from '../services/bookRepository'
import { listingRepository } from '../services/listingRepository'
import { buybackRepository, buybacksStore } from '../services/buybackRepository'
import { api } from '../services/apiClient'
import { pushInBackground } from '../services/syncService'
import { notify } from '../services/toastService'
import { useStore } from './useStore'

export interface CreateBuybackInput {
  bookId?: string
  bookTitle: string
  author: string
  condition: ConditionId
  estimatedPrice: number
  customerName: string
  phone: string
  email?: string
  address: string
  bankName: string
  bankAccount: string
  accountHolder: string
  note?: string
  photo?: string
}

export function useBuybacks() {
  const all = useStore(buybacksStore)

  function create(input: CreateBuybackInput): Result<BuybackRequest> {
    if (input.bookTitle.trim().length < 2) return fail('Vui lòng nhập tên sách')
    if (input.customerName.trim().length < 2) return fail('Vui lòng nhập họ và tên của bạn')
    if (!isVietnamesePhone(input.phone)) return fail('Số điện thoại chưa đúng')
    if (input.email && !isEmail(input.email)) return fail('Email chưa đúng định dạng')
    if (input.address.trim().length < 6) return fail('Vui lòng nhập địa chỉ cụ thể để bưu tá đến lấy sách')
    if (!input.bankName.trim() || !input.bankAccount.trim() || !input.accountHolder.trim()) {
      return fail('Vui lòng điền đủ thông tin tài khoản ngân hàng để nhận tiền')
    }

    const now = new Date().toISOString()
    const request: BuybackRequest = {
      code: generateCode('BB', 6, (c) => !!buybackRepository.find(c)),
      createdAt: now,
      bookId: input.bookId,
      bookTitle: input.bookTitle.trim(),
      author: input.author.trim() || 'Chưa rõ tác giả',
      condition: input.condition,
      estimatedPrice: input.estimatedPrice,
      customerName: input.customerName.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim().toLowerCase(),
      address: input.address.trim(),
      bankName: input.bankName.trim(),
      bankAccount: input.bankAccount.trim(),
      accountHolder: input.accountHolder.trim().toUpperCase(),
      note: input.note?.trim(),
      photo: input.photo,
      status: 'pending',
      history: [
        {
          status: 'pending',
          at: now,
          note: 'Yêu cầu bán lại sách cũ đã gửi thành công. BookWise sẽ liên hệ điều phối bưu tá trong 24h.',
        },
      ],
    }

    buybackRepository.insert(request)
    // Ảnh chụp có thể rất nặng nên không gửi kèm; máy chủ tự định giá lại theo bảng giá
    const { photo: _photo, history: _history, status: _status, ...payload } = request
    pushInBackground('yêu cầu thu mua', () => api.buybacks.create(payload))
    notify(`Đã gửi yêu cầu bán lại sách (${request.code})`, {
      action: { label: 'Theo dõi', to: `/tai-khoan?tab=buyback` },
    })
    return ok(request)
  }

  function advance(item: BuybackRequest, nextStatus: BuybackStatus, note: string) {
    buybackRepository.updateStatus(item.code, nextStatus, note)
    notify(`Yêu cầu ${item.code} → ${nextStatus}`)
  }

  function importToInventory(item: BuybackRequest) {
    if (item.bookId) {
      const book = bookRepository.find(item.bookId)
      if (book) {
        listingRepository.addStock(book.id, item.condition, storePrice(book, item.condition))
        notify(`Đã nhập +1 cuốn “${book.title}” (${CONDITIONS[item.condition].label.toLowerCase()}) vào kho BookWise`)
        return
      }
    }
    notify(`Sách “${item.bookTitle}” đã sẵn sàng nhập kho (Chưa liên kết mã đầu sách)`)
  }

  return {
    requests: all,
    create,
    advance,
    importToInventory,
  }
}
