import { queryAll, queryOne, run } from '../db.js'
import { refreshBook, toListing } from '../lib/listings.js'
import { BUYBACK_RATES, CONDITIONS, priceCap, storePrice } from '../lib/pricing.js'

const CONDITION_NOTES = {
  likenew: 'Đọc một lần, không ghi chú, gáy thẳng',
  used: 'Có thể ngả màu, có ghi chú nhẹ, nội dung đầy đủ',
}

/**
 * Lấy danh sách sách có phân trang, bộ lọc và sắp xếp
 */
export function getBooks(req, res) {
  try {
    const {
      category,
      condition,
      search,
      minPrice,
      maxPrice,
      sort = 'bestseller',
      page = 1,
      limit = 20,
    } = req.query

    let sql = 'SELECT * FROM books WHERE 1=1'
    const params = []

    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }

    if (search) {
      sql += ' AND (title LIKE ? OR author LIKE ? OR original_title LIKE ?)'
      const term = `%${search}%`
      params.push(term, term, term)
    }

    if (minPrice) {
      sql += ' AND price >= ?'
      params.push(Number(minPrice))
    }

    if (maxPrice) {
      sql += ' AND price <= ?'
      params.push(Number(maxPrice))
    }

    // Sắp xếp
    switch (sort) {
      case 'bestseller':
        sql += ' ORDER BY sold DESC'
        break
      case 'rating':
        sql += ' ORDER BY rating DESC, rating_count DESC'
        break
      case 'price_asc':
        sql += ' ORDER BY price ASC'
        break
      case 'price_desc':
        sql += ' ORDER BY price DESC'
        break
      case 'newest':
        sql += ' ORDER BY created_at DESC'
        break
      default:
        sql += ' ORDER BY sold DESC'
    }

    // Đếm tổng số sách theo bộ lọc
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
    const countResult = queryOne(countSql, params)
    const total = countResult ? countResult.total : 0

    // Phân trang
    const numLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const offset = (Math.max(1, Number(page)) - 1) * numLimit
    sql += ' LIMIT ? OFFSET ?'
    params.push(numLimit, offset)

    const rawBooks = queryAll(sql, params)

    // `price` là giá thấp nhất đang bán; có lọc tình trạng thì lấy giá thấp nhất của tình trạng đó
    const formattedBooks = rawBooks.map((b) => {
      const applied = condition in CONDITIONS ? condition : null
      const cheapest = applied
        ? queryOne("SELECT MIN(price) AS price FROM listings WHERE book_id = ? AND condition = ? AND status = 'active' AND qty > 0", [b.id, applied])?.price
        : b.price
      const currentPrice = cheapest ?? storePrice(b, applied ?? 'used')
      return {
        ...b,
        currentPrice,
        appliedCondition: applied,
        discountPercent: b.list_price > currentPrice ? Math.round(((b.list_price - currentPrice) / b.list_price) * 100) : 0,
      }
    })

    return res.json({
      ok: true,
      pagination: {
        page: Number(page),
        limit: numLimit,
        total,
        totalPages: Math.ceil(total / numLimit),
      },
      data: formattedBooks,
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Lấy chi tiết sách theo ID kèm bảng giá các tình trạng và sách liên quan
 */
export function getBookById(req, res) {
  try {
    const { id } = req.params
    const book = queryOne('SELECT * FROM books WHERE id = ?', [id])
    if (!book) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy sách' })
    }

    // Các tin đang bán (kho BookWise + người bán), rẻ nhất trước
    const offers = queryAll(
      "SELECT * FROM listings WHERE book_id = ? AND status = 'active' AND qty > 0 ORDER BY price ASC, id ASC",
      [id]
    ).map(toListing)

    const conditions = Object.entries(CONDITIONS).map(([cid, c]) => {
      const own = offers.filter((o) => o.condition === cid)
      return {
        id: cid,
        label: c.label,
        note: CONDITION_NOTES[cid],
        price: own[0]?.price ?? storePrice(book, cid),
        storePrice: storePrice(book, cid),
        priceCap: priceCap(book, cid),
        buybackPrice: Math.round((book.list_price * BUYBACK_RATES[cid]) / 1000) * 1000,
        listPrice: book.list_price,
        offers: own.length,
        inStock: own.some((o) => o.qty > 0),
      }
    })

    // Lấy đánh giá gần nhất
    const reviews = queryAll('SELECT * FROM book_reviews WHERE book_id = ? ORDER BY created_at DESC LIMIT 5', [id])

    // Sách liên quan cùng thể loại
    const related = queryAll(
      'SELECT id, title, author, price, list_price, cover, rating FROM books WHERE category = ? AND id != ? LIMIT 4',
      [book.category, id]
    )

    return res.json({
      ok: true,
      data: {
        ...book,
        conditions,
        offers,
        reviews,
        relatedBooks: related,
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Thêm sách mới vào kho (Admin / API Key)
 */
export function createBook(req, res) {
  try {
    const {
      id,
      title,
      author,
      category,
      listPrice,
      cover,
      description,
      originalTitle,
      originalLanguage,
      publisher,
      pages,
      firstPublished,
      staffPick,
    } = req.body

    if (!title || !author || !category || !(Number(listPrice) > 0)) {
      return res.status(400).json({ ok: false, error: 'Vui lòng cung cấp tiêu đề, tác giả, thể loại và giá bìa' })
    }

    const bookId = id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const existing = queryOne('SELECT id FROM books WHERE id = ?', [bookId])
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Mã sách này đã tồn tại' })
    }

    const now = new Date().toISOString()
    run(
      `INSERT INTO books (
        id, title, original_title, original_language, author, publisher, category, cover,
        price, list_price, deal_price, stock, sold, rating, rating_count, pages, first_published,
        description, staff_pick, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 5.0, 0, ?, ?, ?, ?, ?)`,
      [
        bookId,
        title.trim(),
        originalTitle || null,
        originalLanguage || null,
        author.trim(),
        publisher || null,
        category,
        cover || `/covers/${bookId}.jpg`,
        storePrice({ list_price: Number(listPrice) }, 'used'),
        Number(listPrice),
        null,
        0,
        Number(pages || 200),
        firstPublished ? Number(firstPublished) : null,
        description || '',
        staffPick || null,
        now,
      ]
    )

    // Sách mới chưa có tin đăng nào: nhập kho qua thu mua hoặc PATCH /api/listings, hoặc chờ người bán đăng
    const created = queryOne('SELECT * FROM books WHERE id = ?', [bookId])
    return res.status(201).json({ ok: true, message: 'Thêm đầu sách thành công', data: created })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Cập nhật thông tin đầu sách và giá bìa (Admin / API Key).
 * Giá bán và tồn kho do các tin đăng quyết định nên không sửa trực tiếp ở đây.
 */
export function updateBook(req, res) {
  try {
    const { id } = req.params
    const book = queryOne('SELECT * FROM books WHERE id = ?', [id])
    if (!book) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy sách' })
    }

    const {
      title = book.title,
      author = book.author,
      listPrice = book.list_price,
      description = book.description,
      staffPick = book.staff_pick,
    } = req.body

    run(
      `UPDATE books
       SET title = ?, author = ?, list_price = ?, description = ?, staff_pick = ?
       WHERE id = ?`,
      [title, author, Number(listPrice), description, staffPick, id]
    )
    // Giá bìa đổi thì giá của kho BookWise đổi theo
    for (const cid of Object.keys(CONDITIONS)) {
      run("UPDATE listings SET price = ? WHERE book_id = ? AND seller_id = 'bookwise' AND condition = ?", [storePrice({ list_price: Number(listPrice) }, cid), id, cid])
    }
    refreshBook(id)

    const updated = queryOne('SELECT * FROM books WHERE id = ?', [id])
    return res.json({ ok: true, message: 'Cập nhật sách thành công', data: updated })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Xóa sách khỏi kho
 */
export function deleteBook(req, res) {
  try {
    const { id } = req.params
    const book = queryOne('SELECT id FROM books WHERE id = ?', [id])
    if (!book) {
      return res.status(404).json({ ok: false, error: 'Không tìm thấy sách' })
    }

    run('DELETE FROM books WHERE id = ?', [id])
    return res.json({ ok: true, message: `Đã xóa sách mã ${id}` })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Danh sách thể loại sách
 */
export function getCategories(req, res) {
  try {
    const categories = queryAll('SELECT * FROM categories')
    return res.json({ ok: true, data: categories })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}
