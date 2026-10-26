import jwt from 'jsonwebtoken'
import { queryOne } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'bookwise_super_secret_jwt_key_2026'

/**
 * Middleware xác thực tích hợp:
 * 1. Hỗ trợ x-api-key header hoặc ?api_key= query parameter (cho hệ thống bên ngoài / headless không có frontend)
 * 2. Hỗ trợ Authorization: Bearer <token> (JWT cho người dùng/admin đăng nhập)
 */
export function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key
  const authHeader = req.headers.authorization

  // 1. Kiểm tra API Key nếu có
  if (apiKey) {
    // Kiểm tra trong database
    const keyRecord = queryOne(
      'SELECT key, name, role, permissions, active FROM api_keys WHERE key = ? AND active = 1',
      [apiKey]
    )

    // Đồng thời chấp nhận các Master API Keys cấu hình trong .env
    const envAdminKey = process.env.ADMIN_API_KEY || 'bw-admin-secret-key-2026'
    const envPartnerKey = process.env.PARTNER_API_KEY || 'bw-delivery-partner-key-2026'
    const envPublicKey = process.env.PUBLIC_API_KEY || 'bw-client-api-key-2026'

    if (keyRecord) {
      req.authType = 'api_key'
      req.apiKey = keyRecord
      req.user = {
        name: keyRecord.name,
        role: keyRecord.role,
        isApiKey: true,
      }
      return next()
    } else if (apiKey === envAdminKey) {
      req.authType = 'api_key'
      req.user = { name: 'Admin Master Key', role: 'admin', isApiKey: true }
      return next()
    } else if (apiKey === envPartnerKey) {
      req.authType = 'api_key'
      req.user = { name: 'Logistics Partner Key', role: 'partner', isApiKey: true }
      return next()
    } else if (apiKey === envPublicKey) {
      req.authType = 'api_key'
      req.user = { name: 'Public Client Key', role: 'client', isApiKey: true }
      return next()
    } else {
      return res.status(401).json({
        ok: false,
        error: 'API Key không hợp lệ hoặc đã bị vô hiệu hóa',
      })
    }
  }

  // 2. Kiểm tra JWT Bearer Token nếu có
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      req.authType = 'jwt'
      req.user = decoded
      return next()
    } catch {
      return res.status(401).json({
        ok: false,
        error: 'Phiên đăng nhập hết hạn hoặc token không hợp lệ',
      })
    }
  }

  // Không có thông tin xác thực
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

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}
