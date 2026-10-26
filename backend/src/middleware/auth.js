import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { queryOne } from '../db.js'

const ENV_KEYS = [
  { key: config.apiKeys.admin, name: 'Admin Master Key', role: 'admin' },
  { key: config.apiKeys.partner, name: 'Logistics Partner Key', role: 'partner' },
  { key: config.apiKeys.client, name: 'Public Client Key', role: 'client' },
].filter((k) => k.key)

const sameSecret = (a, b) => {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

/**
 * Middleware xác thực tích hợp:
 * 1. Header x-api-key (cho hệ thống bên ngoài / headless). Không nhận key qua query string
 *    vì URL bị ghi vào log và lịch sử trình duyệt.
 * 2. Authorization: Bearer <token> (JWT cho người dùng/admin đăng nhập)
 */
export function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key']
  const authHeader = req.headers.authorization

  if (apiKey) {
    const keyRecord = queryOne('SELECT key, name, role, permissions FROM api_keys WHERE key = ? AND active = 1', [apiKey])
    const envKey = keyRecord ? null : ENV_KEYS.find((k) => sameSecret(k.key, apiKey))
    const match = keyRecord ?? envKey
    if (!match) {
      return res.status(401).json({ ok: false, error: 'API Key không hợp lệ hoặc đã bị vô hiệu hóa' })
    }
    req.authType = 'api_key'
    req.user = { name: match.name, role: match.role, isApiKey: true }
    return next()
  }

  if (authHeader?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.slice(7), config.jwtSecret)
      req.authType = 'jwt'
      return next()
    } catch {
      return res.status(401).json({ ok: false, error: 'Phiên đăng nhập hết hạn hoặc token không hợp lệ' })
    }
  }

  req.user = null
  next()
}

/**
 * Bắt buộc phải có đăng nhập hoặc API Key
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: 'Yêu cầu xác thực. Vui lòng cung cấp Header x-api-key hoặc Bearer Token',
    })
  }
  next()
}

/**
 * Bắt buộc quyền Quản trị (Admin) hoặc Admin API Key
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      ok: false,
      error: 'Quyền truy cập bị từ chối. Chỉ Quản trị viên (Admin) hoặc Admin API Key mới có quyền thực hiện',
    })
  }
  next()
}

/**
 * Quyền Quản trị hoặc Đối tác vận chuyển (Admin hoặc Partner API Key)
 */
export function requireAdminOrPartner(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'partner')) {
    return res.status(403).json({
      ok: false,
      error: 'Yêu cầu quyền Quản trị hoặc Đối tác vận chuyển',
    })
  }
  next()
}

export const isStaff = (user) => user?.role === 'admin' || user?.role === 'partner'

export function generateToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' })
}
