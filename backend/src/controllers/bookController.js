import { queryAll, queryOne, run } from '../db.js'

const CONDITION_FACTORS = {
  seal: 1.0,
  likenew: 0.8,
  used: 0.6,
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
    const numLimit = Math.max(1, Number(limit))
    const offset = (Math.max(1, Number(page)) - 1) * numLimit
    sql += ' LIMIT ? OFFSET ?'
    params.push(numLimit, offset)

    const rawBooks = queryAll(sql, params)

    // Format giá theo tình trạng nếu có yêu cầu tình trạng cụ thể
    const formattedBooks = rawBooks.map((b) => {
      const factor = condition && CONDITION_FACTORS[condition] ? CONDITION_FACTORS[condition] : 1
      const currentPrice = Math.round((b.deal_price || b.price) * factor)
      return {
        ...b,
        currentPrice,
        appliedCondition: condition || 'seal',
        discountPercent: b.list_price > b.price ? Math.round(((b.list_price - b.price) / b.list_price) * 100) : 0,
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

    // Tính giá và tình trạng sẵn có
    const conditions = [
      {
        id: 'seal',
        label: 'Mới, nguyên seal',
        note: 'Sách mới từ nhà phát hành',
        price: book.deal_price || book.price,
        listPrice: book.list_price,
        inStock: book.stock > 0,
      },
      {
        id: 'likenew',
        label: 'Như mới · 98%',
        note: 'Đọc một lần, không ghi chú, gáy thẳng',
        price: Math.round((book.deal_price || book.price) * 0.8),
        listPrice: book.list_price,
        inStock: true,
      },
      {
        id: 'used',
        label: 'Đã qua sử dụng · 90%',
        note: 'Có thể ngả màu nhẹ, nội dung đầy đủ',
        price: Math.round((book.deal_price || book.price) * 0.6),
        listPrice: book.list_price,
        inStock: true,
      },
    ]

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
      price,
      listPrice,
      dealPrice,
      stock = 20,
      cover,
      description,
      originalTitle,
      originalLanguage,
      publisher,
      pages,
      firstPublished,
      staffPick,
    } = req.body

    if (!title || !author || !category || !price || !listPrice) {
      return res.status(400).json({ ok: false, error: 'Vui lòng cung cấp tiêu đề, tác giả, thể loại, giá bán và giá bìa' })
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
        Number(price),
        Number(listPrice),
        dealPrice ? Number(dealPrice) : null,
        Number(stock),
        Number(pages || 200),
        firstPublished ? Number(firstPublished) : null,
        description || '',
        staffPick || null,
        now,
      ]
    )

    const created = queryOne('SELECT * FROM books WHERE id = ?', [bookId])
    return res.status(201).json({ ok: true, message: 'Thêm sách mới thành công', data: created })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Cập nhật thông tin sách, giá bán, tồn kho (Admin / API Key)
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
      price = book.price,
      listPrice = book.list_price,
      dealPrice = book.deal_price,
      stock = book.stock,
      description = book.description,
      staffPick = book.staff_pick,
    } = req.body

    run(
      `UPDATE books
       SET title = ?, author = ?, price = ?, list_price = ?, deal_price = ?, stock = ?, description = ?, staff_pick = ?
       WHERE id = ?`,
      [title, author, Number(price), Number(listPrice), dealPrice ? Number(dealPrice) : null, Number(stock), description, staffPick, id]
    )

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
