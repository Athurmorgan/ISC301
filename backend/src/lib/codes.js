import crypto from 'node:crypto'
import { queryOne } from '../db.js'

/** Sinh mã dạng PREFIX-123456 chưa có trong bảng. `table`/`column` là hằng số trong code, không lấy từ request. */
export function uniqueCode(prefix, digits, table, column = 'code') {
  for (;;) {
    const n = crypto.randomInt(10 ** (digits - 1), 10 ** digits)
    const code = `${prefix}-${n}`
    if (!queryOne(`SELECT 1 FROM ${table} WHERE ${column} = ?`, [code])) return code
  }
}
