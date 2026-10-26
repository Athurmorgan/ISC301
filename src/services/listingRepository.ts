import { SEED_BOOKS } from '../data/books'
import { DEMO_SELLER } from '../data/catalog'
import { isBuyable, seedStoreListings, withOffers } from '../models/listing'
import { fail, ok } from '../models/result'
import type { Listing, OrderItem, Result } from '../models/types'
import { booksStore } from './bookRepository'
import { derivedStore, persistentStore } from './store'

const SEED_AT = '2025-01-01T00:00:00.000Z'

/** Vài tin của tài khoản sinh viên mẫu để trang chi tiết có nhiều người bán */
const DEMO_LISTINGS: [string, Listing['condition'], number, string][] = [
  ['tam-ly-hoc-ve-tien', 'likenew', 99_000, 'Mua học kỳ trước, đọc một lần, còn bookmark tặng kèm'],
  ['cha-giau-cha-ngheo', 'used', 39_000, 'Gáy hơi cong, vài trang gạch chân bút chì'],
  ['nha-dau-tu-thong-minh', 'likenew', 139_000, 'Sách môn Tài chính doanh nghiệp, giữ rất kỹ'],
  ['su-that-ve-the-gioi', 'used', 59_000, 'Bìa sờn góc, ruột sạch'],
  ['nguon-goc-cac-loai', 'used', 79_000, 'Có ghi chú bên lề chương 4–6'],
]

function seed(): Listing[] {
  const demo: Listing[] = DEMO_LISTINGS.map(([bookId, condition, price, note], i) => ({
    id: `sv-${bookId}`,
    bookId,
    sellerId: DEMO_SELLER.email,
    sellerName: DEMO_SELLER.name,
    condition,
    price,
    qty: i === 0 ? 2 : 1,
    sold: 0,
    note,
    status: 'active',
    createdAt: SEED_AT,
    updatedAt: SEED_AT,
  }))
  return [...seedStoreListings(SEED_BOOKS, SEED_AT), ...demo]
}

export const listingsStore = persistentStore<Listing[]>('listings', seed)

/** Danh mục sách kèm giá thấp nhất và tổng số cuốn đang bán — nguồn dữ liệu cho mọi trang hiển thị sách */
export const catalogStore = derivedStore(booksStore, listingsStore, withOffers)

const now = () => new Date().toISOString()

/** Tin của kho BookWise cho một đầu sách và tình trạng (dùng khi đơn cũ chưa ghi tin đăng) */
const storeListingId = (bookId: string, condition: string) => `bw-${bookId}-${condition}`

export const listingRepository = {
  all: () => listingsStore.get(),
  find: (id: string) => listingsStore.get().find((l) => l.id === id),
  bySeller: (sellerId: string) => listingsStore.get().filter((l) => l.sellerId === sellerId),

  save(listing: Listing) {
    listingsStore.set((list) =>
      list.some((l) => l.id === listing.id) ? list.map((l) => (l.id === listing.id ? listing : l)) : [listing, ...list],
    )
  },

  update(id: string, patch: Partial<Listing>) {
    listingsStore.set((list) => list.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: now() } : l)))
  },

  remove(id: string) {
    listingsStore.set((list) => list.filter((l) => l.id !== id))
  },

  /** Khoá hoặc mở lại toàn bộ tin của một người bán */
  setSellerSuspended(sellerId: string, suspended: boolean) {
    const [from, to] = suspended ? (['active', 'suspended'] as const) : (['suspended', 'active'] as const)
    listingsStore.set((list) => list.map((l) => (l.sellerId === sellerId && l.status === from ? { ...l, status: to, updatedAt: now() } : l)))
  },

  /** Cộng thêm cuốn vào kho BookWise (sách thu mua đã kiểm định) */
  addStock(bookId: string, condition: Listing['condition'], price: number, qty = 1) {
    const id = storeListingId(bookId, condition)
    const existing = listingsStore.get().find((l) => l.id === id)
    if (existing) {
      this.update(id, { qty: existing.qty + qty, status: existing.status === 'removed' ? existing.status : 'active' })
      return
    }
    const at = now()
    this.save({ id, bookId, sellerId: 'bookwise', sellerName: 'BookWise', condition, price, qty, sold: 0, note: 'Sách thu mua đã qua kiểm định', status: 'active', createdAt: at, updatedAt: at })
  },

  /** Trừ số cuốn của từng tin khi đặt hàng; thất bại nếu một tin không còn đủ */
  reserve(items: Pick<OrderItem, 'listingId' | 'bookId' | 'qty' | 'title'>[]): Result<undefined> {
    const list = listingsStore.get()
    for (const i of items) {
      const l = list.find((x) => x.id === i.listingId)
      if (!l || !isBuyable(l) || l.qty < i.qty) return fail(`“${i.title}” của người bán này không còn đủ sách`)
    }
    const take = new Map(items.map((i) => [i.listingId, i.qty]))
    listingsStore.set(list.map((l) => (take.has(l.id) ? { ...l, qty: l.qty - take.get(l.id)!, sold: l.sold + take.get(l.id)! } : l)))
    addSold(items, 1)
    return ok(undefined)
  },

  /** Trả sách về tin đăng khi đơn bị huỷ */
  release(items: Pick<OrderItem, 'listingId' | 'bookId' | 'condition' | 'qty'>[]) {
    listingsStore.set((list) =>
      list.map((l) => {
        const qty = items.filter((i) => (i.listingId ?? storeListingId(i.bookId, i.condition)) === l.id).reduce((s, i) => s + i.qty, 0)
        return qty ? { ...l, qty: l.qty + qty, sold: Math.max(0, l.sold - qty) } : l
      }),
    )
    addSold(items, -1)
  },
}

function addSold(items: Pick<OrderItem, 'bookId' | 'qty'>[], sign: 1 | -1) {
  booksStore.set((list) =>
    list.map((b) => {
      const qty = items.filter((i) => i.bookId === b.id).reduce((s, i) => s + i.qty, 0)
      return qty ? { ...b, sold: Math.max(0, b.sold + sign * qty) } : b
    }),
  )
}
