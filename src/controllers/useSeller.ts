import { useMemo } from 'react'
import { SELLER_STATUS_LABEL } from '../data/catalog'
import { sellerSales, sellerSummary, validateListing, type ListingInput } from '../models/listing'
import { fail, ok } from '../models/result'
import { bankName, validateSellerForm, type SellerForm } from '../models/seller'
import { BOOKWISE_SELLER, type Listing, type Result, type SellerApplication } from '../models/types'
import { hasErrors } from '../models/validation'
import { api } from '../services/apiClient'
import { catalogStore, listingRepository, listingsStore } from '../services/listingRepository'
import { ordersStore } from '../services/orderRepository'
import { sellerRepository, sellersStore } from '../services/sellerRepository'
import { pushInBackground } from '../services/syncService'
import { notify, notifyError } from '../services/toastService'
import { sessionStore, userRepository } from '../services/userRepository'
import { useStore } from './useStore'

const now = () => new Date().toISOString()

/** Phía người dùng: đăng ký bán, quản lý tin đăng, theo dõi tiền bán sách */
export function useSellerCenter() {
  const email = useStore(sessionStore)
  const applications = useStore(sellersStore)
  const listings = useStore(listingsStore)
  const orders = useStore(ordersStore)

  const application = email ? applications.find((a) => a.email === email) : undefined
  const approved = application?.status === 'approved'
  const myListings = useMemo(() => listings.filter((l) => l.sellerId === email), [listings, email])
  const sales = useMemo(() => (email ? sellerSales(orders, email) : []), [orders, email])

  function apply(form: SellerForm): Result<SellerApplication> {
    if (!email) return fail('Đăng nhập để đăng ký bán sách')
    if (application && application.status !== 'rejected') return fail('Bạn đã gửi hồ sơ, vui lòng chờ BookWise phản hồi')
    if (hasErrors(validateSellerForm(form))) return fail('Hồ sơ còn thiếu thông tin')
    const at = now()
    const app: SellerApplication = {
      email,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      idNumber: form.idNumber.trim(),
      idPhoto: form.idPhoto,
      studentCardPhoto: form.studentCardPhoto || undefined,
      school: form.school.trim(),
      pickupAddress: form.pickupAddress.trim(),
      bankName: form.bankName.trim(),
      bankAccount: form.bankAccount.replace(/\s/g, ''),
      accountHolder: bankName(form.accountHolder),
      status: 'pending',
      submittedAt: at,
      history: [...(application?.history ?? []), { status: 'pending', at, note: application ? 'Gửi lại hồ sơ' : 'Gửi hồ sơ đăng ký bán sách' }],
    }
    sellerRepository.submit(app)
    // Ảnh giấy tờ chỉ lưu trên máy trong bản demo, không gửi lên máy chủ
    const { idPhoto: _id, studentCardPhoto: _card, history: _h, ...payload } = app
    pushInBackground('hồ sơ người bán', () => api.sellers.apply({ ...payload, hasStudentCard: !!app.studentCardPhoto }))
    notify('Đã gửi hồ sơ. BookWise sẽ duyệt trong 1–2 ngày làm việc')
    return ok(app)
  }

  function saveListing(input: ListingInput, editing?: Listing): Result<Listing> {
    if (!email || !application || !approved) return fail('Tài khoản chưa được cấp quyền bán sách')
    const book = catalogStore.get().find((b) => b.id === input.bookId)
    const error = validateListing(input, book)
    if (error) return fail(error)
    const at = now()
    const listing: Listing = editing
      ? { ...editing, ...input, note: input.note.trim(), status: editing.status === 'removed' ? 'removed' : editing.status, updatedAt: at }
      : {
          id: `sv-${Date.now().toString(36)}`,
          ...input,
          note: input.note.trim(),
          sellerId: email,
          sellerName: application.fullName,
          sold: 0,
          status: 'active',
          createdAt: at,
          updatedAt: at,
        }
    listingRepository.save(listing)
    pushInBackground('tin đăng', () => api.listings.save(listing))
    notify(editing ? 'Đã cập nhật tin đăng' : `Đã đăng bán “${book!.title}”`)
    return ok(listing)
  }

  function togglePause(listing: Listing) {
    if (listing.status !== 'active' && listing.status !== 'paused') return notifyError('Tin này đang bị khoá, liên hệ BookWise')
    const status = listing.status === 'active' ? 'paused' : 'active'
    listingRepository.update(listing.id, { status })
    pushInBackground('tin đăng', () => api.listings.save({ ...listing, status }))
  }

  function removeListing(listing: Listing) {
    listingRepository.remove(listing.id)
    pushInBackground('xoá tin đăng', () => api.listings.remove(listing.id))
    notify('Đã xoá tin đăng')
  }

  return {
    email,
    application,
    approved,
    myListings,
    sales,
    summary: sellerSummary(sales),
    apply,
    saveListing,
    togglePause,
    removeListing,
  }
}

/** Phía quản trị: duyệt hồ sơ người bán và kiểm soát tin đăng */
export function useSellerAdmin() {
  const applications = useStore(sellersStore)
  const listings = useStore(listingsStore)
  const marketListings = useMemo(() => listings.filter((l) => l.sellerId !== BOOKWISE_SELLER), [listings])

  function review(app: SellerApplication, status: SellerApplication['status'], note: string) {
    if (status !== 'approved' && !note.trim()) return notifyError('Nhập lý do để người bán biết cần bổ sung gì')
    sellerRepository.setStatus(app.email, status, note.trim() || 'Hồ sơ hợp lệ')
    if (status === 'suspended') listingRepository.setSellerSuspended(app.email, true)
    if (status === 'approved' && app.status === 'suspended') listingRepository.setSellerSuspended(app.email, false)
    pushInBackground('duyệt người bán', () => api.sellers.review(app.email, status, note.trim()))
    notify(`${userRepository.find(app.email)?.name ?? app.fullName}: ${SELLER_STATUS_LABEL[status]}`)
  }

  function takeDown(listing: Listing, reason: string) {
    if (!reason.trim()) return notifyError('Nhập lý do gỡ tin')
    listingRepository.update(listing.id, { status: 'removed', reason: reason.trim() })
    pushInBackground('gỡ tin', () => api.listings.moderate(listing.id, 'removed', reason.trim()))
    notify('Đã gỡ tin đăng')
  }

  function restore(listing: Listing) {
    listingRepository.update(listing.id, { status: 'active', reason: undefined })
    pushInBackground('khôi phục tin', () => api.listings.moderate(listing.id, 'active', ''))
    notify('Đã khôi phục tin đăng')
  }

  return {
    applications,
    pending: applications.filter((a) => a.status === 'pending').length,
    listings: marketListings,
    review,
    takeDown,
    restore,
  }
}
