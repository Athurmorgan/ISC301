// Tin đăng bán: mỗi cuốn sách trên sàn thuộc về một tin (của kho BookWise hoặc của người bán đã được duyệt).
// Cột price / stock của bảng books chỉ là số tổng hợp từ các tin đang bán để các truy vấn cũ vẫn dùng được.

import { queryAll, queryOne, run } from '../db.js'
import { BOOKWISE_SELLER, storePrice } from './pricing.js'

export const storeListingId = (bookId, condition) => `bw-${bookId}-${condition}`

/** Cập nhật giá thấp nhất và tổng số cuốn đang bán của một đầu sách */
export function refreshBook(bookId) {
  const book = queryOne('SELECT id, list_price FROM books WHERE id = ?', [bookId])
  if (!book) return
  const agg = queryOne(
    `SELECT MIN(price) AS price, COALESCE(SUM(qty), 0) AS stock
     FROM listings WHERE book_id = ? AND status = 'active' AND qty > 0`,
    [bookId]
  )
  run('UPDATE books SET price = ?, stock = ?, deal_price = NULL WHERE id = ?', [agg?.price ?? storePrice(book, 'used'), agg?.stock ?? 0, bookId])
}

/** Nhập thêm sách vào tin của kho BookWise (thu mua, admin bổ sung, hoàn kho khi huỷ đơn) */
export function addStoreStock(bookId, condition, qty, now = new Date().toISOString()) {
  const book = queryOne('SELECT id, list_price FROM books WHERE id = ?', [bookId])
  if (!book) return
  const id = storeListingId(bookId, condition)
  if (queryOne('SELECT 1 AS found FROM listings WHERE id = ?', [id])) {
    run("UPDATE listings SET qty = MAX(0, qty + ?), status = 'active', updated_at = ? WHERE id = ?", [qty, now, id])
  } else if (qty > 0) {
    run(
      `INSERT INTO listings (id, book_id, seller_id, seller_name, condition, price, qty, sold, note, status, created_at, updated_at)
       VALUES (?, ?, ?, 'BookWise', ?, ?, ?, 0, 'Đã qua kiểm định 7 bước của BookWise', 'active', ?, ?)`,
      [id, bookId, BOOKWISE_SELLER, condition, storePrice(book, condition), qty, now, now]
    )
  }
  refreshBook(bookId)
}

/** Khoá / mở lại toàn bộ tin của một người bán */
export function setSellerSuspended(sellerId, suspended, now = new Date().toISOString()) {
  const [from, to] = suspended ? ['active', 'suspended'] : ['suspended', 'active']
  const books = queryAll('SELECT DISTINCT book_id FROM listings WHERE seller_id = ? AND status = ?', [sellerId, from])
  run('UPDATE listings SET status = ?, updated_at = ? WHERE seller_id = ? AND status = ?', [to, now, sellerId, from])
  for (const b of books) refreshBook(b.book_id)
}

export const toListing = (row) =>
  row && {
    id: row.id,
    bookId: row.book_id,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    condition: row.condition,
    price: row.price,
    qty: row.qty,
    sold: row.sold,
    note: row.note ?? '',
    status: row.status,
    reason: row.reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
