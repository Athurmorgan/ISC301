import { normalize } from './format'
import { unitPrice } from './pricing'
import type { Book, CategoryId } from './types'

export type SortKey = 'popular' | 'newest' | 'price-asc' | 'price-desc' | 'rating'

export const SORT_LABEL: Record<SortKey, string> = {
  popular: 'Bán chạy',
  rating: 'Đánh giá cao',
  newest: 'Xuất bản gần đây',
  'price-asc': 'Giá tăng dần',
  'price-desc': 'Giá giảm dần',
}

export type PriceBand = 'all' | 'under-100' | '100-150' | '150-200' | 'over-200'

export const PRICE_BANDS: Record<PriceBand, { label: string; min: number; max: number }> = {
  all: { label: 'Mọi mức giá', min: 0, max: Infinity },
  'under-100': { label: 'Dưới 100.000đ', min: 0, max: 99_999 },
  '100-150': { label: '100.000 – 150.000đ', min: 100_000, max: 150_000 },
  '150-200': { label: '150.000 – 200.000đ', min: 150_001, max: 200_000 },
  'over-200': { label: 'Trên 200.000đ', min: 200_001, max: Infinity },
}

export interface CatalogQuery {
  q: string
  category: CategoryId | 'all'
  price: PriceBand
  inStock: boolean
  deals: boolean
  sort: SortKey
  page: number
}

export const DEFAULT_QUERY: CatalogQuery = {
  q: '',
  category: 'all',
  price: 'all',
  inStock: false,
  deals: false,
  sort: 'popular',
  page: 1,
}

export const PAGE_SIZE = 12

const matches = (book: Book, q: string) => {
  if (!q) return true
  const haystack = normalize(`${book.title} ${book.originalTitle} ${book.author} ${book.publisher ?? ''}`)
  return normalize(q)
    .split(/\s+/)
    .every((word) => haystack.includes(word))
}

const comparators: Record<SortKey, (a: Book, b: Book) => number> = {
  popular: (a, b) => b.sold - a.sold,
  rating: (a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount,
  newest: (a, b) => b.firstPublished - a.firstPublished,
  'price-asc': (a, b) => unitPrice(a) - unitPrice(b),
  'price-desc': (a, b) => unitPrice(b) - unitPrice(a),
}

export function runQuery(books: Book[], query: CatalogQuery) {
  const band = PRICE_BANDS[query.price]
  const filtered = books
    .filter((b) => query.category === 'all' || b.category === query.category)
    .filter((b) => matches(b, query.q))
    .filter((b) => {
      const p = unitPrice(b)
      return p >= band.min && p <= band.max
    })
    .filter((b) => !query.inStock || b.stock > 0)
    .filter((b) => !query.deals || b.dealPrice !== undefined)
    .sort(comparators[query.sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, query.page), pageCount)
  return {
    total: filtered.length,
    page,
    pageCount,
    items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  }
}

/** Gợi ý nhanh khi gõ ô tìm kiếm */
export const suggest = (books: Book[], q: string, limit = 6) => (q.trim() ? books.filter((b) => matches(b, q)).slice(0, limit) : [])

export const related = (books: Book[], book: Book, limit = 4) =>
  books
    .filter((b) => b.id !== book.id && b.category === book.category && b.stock > 0)
    .sort((a, b) => Number(b.author === book.author) - Number(a.author === book.author) || b.sold - a.sold)
    .slice(0, limit)


// ---- Đồng bộ truy vấn với URL (tham số tiếng Việt cho dễ đọc) ----

const oneOf = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

export function parseQuery(params: URLSearchParams, categories: readonly CategoryId[]): CatalogQuery {
  return {
    q: params.get('q') ?? '',
    category: oneOf<CategoryId | 'all'>(params.get('the-loai'), ['all', ...categories], 'all'),
    price: oneOf(params.get('gia'), Object.keys(PRICE_BANDS) as PriceBand[], 'all'),
    inStock: params.get('con-hang') === '1',
    deals: params.get('uu-dai') === '1',
    sort: oneOf(params.get('sap-xep'), Object.keys(SORT_LABEL) as SortKey[], 'popular'),
    page: Math.max(1, Number(params.get('trang')) || 1),
  }
}

export function serializeQuery(q: CatalogQuery): URLSearchParams {
  const p = new URLSearchParams()
  if (q.q.trim()) p.set('q', q.q.trim())
  if (q.category !== DEFAULT_QUERY.category) p.set('the-loai', q.category)
  if (q.price !== DEFAULT_QUERY.price) p.set('gia', q.price)
  if (q.inStock) p.set('con-hang', '1')
  if (q.deals) p.set('uu-dai', '1')
  if (q.sort !== DEFAULT_QUERY.sort) p.set('sap-xep', q.sort)
  if (q.page > 1) p.set('trang', String(q.page))
  return p
}

export const countActiveFilters = (q: CatalogQuery) =>
  [q.q, q.category !== 'all', q.price !== 'all', q.inStock, q.deals].filter(Boolean).length
