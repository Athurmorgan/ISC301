import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = path.resolve(__dirname, '../data')
const DB_PATH = path.join(DB_DIR, 'bookwise.sqlite')
const SCHEMA_PATH = path.join(DB_DIR, 'schema.sql')

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

export const db = new DatabaseSync(DB_PATH)

// Bật Foreign Keys & WAL mode
db.exec('PRAGMA foreign_keys = ON;')
db.exec('PRAGMA journal_mode = WAL;')

// Tự động khởi tạo schema nếu các bảng chưa tồn tại
if (fs.existsSync(SCHEMA_PATH)) {
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8')
  db.exec(schemaSql)
}

// Database tạo trước khi có sàn người bán: bổ sung cột còn thiếu cho order_items
const ensureColumn = (table, column, type) => {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  }
}
ensureColumn('order_items', 'listing_id', 'TEXT')
ensureColumn('order_items', 'seller_id', 'TEXT')
ensureColumn('order_items', 'seller_name', 'TEXT')

/**
 * Helper thực thi truy vấn trả về nhiều dòng
 */
export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  return stmt.all(...params)
}

/**
 * Helper thực thi truy vấn trả về 1 dòng duy nhất
 */
export function queryOne(sql, params = []) {
  const stmt = db.prepare(sql)
  const rows = stmt.all(...params)
  return rows.length > 0 ? rows[0] : null
}

/**
 * Helper thực thi INSERT, UPDATE, DELETE
 */
export function run(sql, params = []) {
  const stmt = db.prepare(sql)
  return stmt.run(...params)
}

/**
 * Thực thi transaction an toàn
 */
export function transaction(fn) {
  db.exec('BEGIN TRANSACTION')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export default {
  db,
  queryAll,
  queryOne,
  run,
  transaction,
}
