import crypto from 'node:crypto'
import { queryOne, run } from '../db.js'
import { generateToken } from '../middleware/auth.js'

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function login(req, res) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Vui lòng cung cấp email và mật khẩu' })
    }

    const user = queryOne(
      'SELECT id, email, name, phone, role, province, district, street, password_hash FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    )

    if (!user || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ ok: false, error: 'Email hoặc mật khẩu không chính xác' })
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    return res.json({
      ok: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          address: {
            province: user.province,
            district: user.district,
            street: user.street,
          },
        },
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

export function register(req, res) {
  try {
    const { email, password, name, phone, province, district, street } = req.body
    if (!email || !password || !name || !phone) {
      return res.status(400).json({ ok: false, error: 'Vui lòng điền đầy đủ các thông tin bắt buộc' })
    }

    const cleanEmail = email.toLowerCase().trim()
    const existing = queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail])
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Email này đã được đăng ký' })
    }

    const now = new Date().toISOString()
    run(
      `INSERT INTO users (email, name, phone, password_hash, role, province, district, street, created_at)
       VALUES (?, ?, ?, ?, 'customer', ?, ?, ?, ?)`,
      [cleanEmail, name.trim(), phone.trim(), hashPassword(password), province || null, district || null, street || null, now]
    )

    const newUser = queryOne('SELECT id, email, name, phone, role, province, district, street FROM users WHERE email = ?', [cleanEmail])
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    })

    return res.status(201).json({
      ok: true,
      message: 'Đăng ký tài khoản thành công',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone,
          role: newUser.role,
          address: {
            province: newUser.province,
            district: newUser.district,
            street: newUser.street,
          },
        },
      },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

export function getProfile(req, res) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'Chưa đăng nhập' })
  }

  if (req.user.isApiKey) {
    return res.json({
      ok: true,
      data: {
        type: 'api_key',
        name: req.user.name,
        role: req.user.role,
      },
    })
  }

  const user = queryOne(
    'SELECT id, email, name, phone, role, province, district, street, created_at FROM users WHERE email = ?',
    [req.user.email]
  )

  if (!user) {
    return res.status(404).json({ ok: false, error: 'Không tìm thấy người dùng' })
  }

  return res.json({
    ok: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      address: {
        province: user.province,
        district: user.district,
        street: user.street,
      },
      createdAt: user.created_at,
    },
  })
}

export function verifyApiKey(req, res) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key
  if (!apiKey) {
    return res.status(400).json({ ok: false, error: 'Thiếu x-api-key' })
  }

  const keyRecord = queryOne('SELECT key, name, role, permissions, active FROM api_keys WHERE key = ?', [apiKey])
  if (!keyRecord) {
    return res.status(404).json({ ok: false, error: 'API Key không tồn tại' })
  }

  return res.json({
    ok: true,
    message: 'API Key hợp lệ',
    data: keyRecord,
  })
}
