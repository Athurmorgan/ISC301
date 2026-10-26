import { normalize } from '../models/format'
import { fail, ok } from '../models/result'
import { storePrice } from '../models/pricing'
import type { Book, CategoryId, ConditionId, Result } from '../models/types'
import { bookRepository } from '../services/bookRepository'
import { listingRepository } from '../services/listingRepository'
import { notify } from '../services/toastService'

/** Dữ liệu form thêm/sửa sách (giá trị chuỗi từ input) */
export interface BookForm {
  id?: string
  title: string
  originalTitle: string
  author: string
  publisher: string
  category: CategoryId
  listPrice: string
  pages: string
  firstPublished: string
  cover: string
  description: string
}

export const emptyBookForm = (): BookForm => ({
  title: '', originalTitle: '', author: '', publisher: '', category: 'kinh-te', listPrice: '', pages: '', firstPublished: '', cover: '', description: '',
})

export const toForm = (b: Book): BookForm => ({
  id: b.id, title: b.title, originalTitle: b.originalTitle, author: b.author, publisher: b.publisher ?? '', category: b.category,
  listPrice: String(b.listPrice),
  pages: String(b.pages), firstPublished: String(b.firstPublished), cover: b.cover, description: b.description,
})

const slugify = (s: string) => normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export type BookFormErrors = Partial<Record<keyof BookForm, string>>

export function validateBookForm(f: BookForm): BookFormErrors {
  const e: BookFormErrors = {}
  const n = (s: string) => Number(s)
  if (f.title.trim().length < 2) e.title = 'Nhập tên sách'
  if (f.author.trim().length < 2) e.author = 'Nhập tác giả'
  if (!(n(f.listPrice) > 0)) e.listPrice = 'Giá bìa phải lớn hơn 0'
  if (f.firstPublished && !(n(f.firstPublished) > 1400 && n(f.firstPublished) <= new Date().getFullYear())) e.firstPublished = 'Năm không hợp lệ'
  if (f.cover && !/^(https?:\/\/|\/|data:image\/)/.test(f.cover)) e.cover = 'Đường dẫn ảnh bắt đầu bằng http(s):// hoặc /'
  return e
}

export function useAdminBooks() {
  return {
    save(form: BookForm): Result<Book> {
      const existing = form.id ? bookRepository.find(form.id) : undefined
      let id = existing?.id ?? slugify(form.title)
      if (!existing) {
        let i = 2
        const base = id || 'sach'
        while (bookRepository.find(id)) id = `${base}-${i++}`
      }
      const book: Book = {
        ...(existing ?? { sold: 0, rating: 0, ratingCount: 0, originalLanguage: '', price: 0, stock: 0 }),
        id,
        title: form.title.trim(),
        originalTitle: form.originalTitle.trim(),
        author: form.author.trim(),
        publisher: form.publisher.trim() || undefined,
        category: form.category,
        listPrice: Number(form.listPrice),
        pages: Number(form.pages) || 0,
        firstPublished: Number(form.firstPublished) || new Date().getFullYear(),
        cover: form.cover.trim(),
        description: form.description.trim(),
      }
      if (!book.title) return fail('Thiếu tên sách')
      bookRepository.save(book)
      notify(existing ? `Đã cập nhật “${book.title}”` : `Đã thêm “${book.title}” vào danh mục, hãy nhập số cuốn trong kho`)
      return ok(book)
    },
    remove(book: Book) {
      bookRepository.remove(book.id)
      notify(`Đã xoá “${book.title}”`)
    },
    /** Tăng/giảm số cuốn BookWise tự bán theo tình trạng */
    adjustStock(book: Book, condition: ConditionId, delta: number) {
      const listing = listingRepository.find(`bw-${book.id}-${condition}`)
      if (delta > 0) listingRepository.addStock(book.id, condition, storePrice(book, condition), delta)
      else if (listing) listingRepository.update(listing.id, { qty: Math.max(0, listing.qty + delta) })
    },
  }
}
