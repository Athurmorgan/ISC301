import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CATEGORIES } from '../data/catalog'
import { countActiveFilters, parseQuery, runQuery, serializeQuery, type CatalogQuery } from '../models/catalogQuery'
import { isOnDeal } from '../models/pricing'
import { catalogStore, listingsStore } from '../services/listingRepository'
import { offersFor } from '../models/listing'
import { useStore } from './useStore'

/** Đầu sách kèm giá thấp nhất và số cuốn đang bán */
export const useBooks = () => useStore(catalogStore)

/** Các tin đăng còn hàng của một đầu sách, rẻ nhất trước */
export function useOffers(bookId: string) {
  const listings = useStore(listingsStore)
  return useMemo(() => offersFor(listings, bookId), [listings, bookId])
}

export function useBook(id: string | undefined) {
  const books = useBooks()
  return useMemo(() => books.find((b) => b.id === id), [books, id])
}

export function useShelves() {
  const books = useBooks()
  return useMemo(() => {
    const inStock = books.filter((b) => b.stock > 0)
    return {
      deals: inStock.filter(isOnDeal).sort((a, b) => a.price / a.listPrice - b.price / b.listPrice),
      bestsellers: [...inStock].sort((a, b) => b.sold - a.sold).slice(0, 10),
      staffPicks: books.filter((b) => b.staffPick),
      categoryCounts: CATEGORIES.map((c) => ({ ...c, count: books.filter((b) => b.category === c.id).length })),
    }
  }, [books])
}

const CATEGORY_IDS = CATEGORIES.map((c) => c.id)

/** Trạng thái lọc của trang danh mục được giữ trên URL để chia sẻ hoặc quay lại được. */
export function useCatalog() {
  const books = useBooks()
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => parseQuery(params, CATEGORY_IDS), [params])
  const result = useMemo(() => runQuery(books, query), [books, query])

  const update = useCallback(
    (patch: Partial<CatalogQuery>) => setParams(serializeQuery({ ...query, page: 1, ...patch })),
    [query, setParams],
  )

  return {
    query,
    result,
    update,
    activeFilters: countActiveFilters(query),
    reset: () => setParams(new URLSearchParams()),
  }
}
