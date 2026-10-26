import { queryOne, run } from '../db.js'
import { hashPassword, needsRehash, verifyPassword } from '../lib/password.js'
import { generateToken } from '../middleware/auth.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(0|\+84)\d{9}$/
const MIN_PASSWORD = 6

const USER_COLUMNS = 'id, email, name, phone, role, province, district, street, created_at'

function publicUser(user) {
  return {
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
  }
}

const tokenFor = (user) => generateToken({ id: user.id, email: user.email, name: user.name, role: user.role })

export function login(req, res) {
  try {
    const { email, password } = req.body ?? {}
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Vui lòng cung cấp email và mật khẩu' })
    }

    const user = queryOne(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ?`, [email.toLowerCase().trim()])
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ ok: false, error: 'Email hoặc mật khẩu không chính xác' })
    }
    if (needsRehash(user.password_hash)) {
      run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(password), user.id])
    }

    return res.json({
      ok: true,
      message: 'Đăng nhập thành công',
      data: { token: tokenFor(user), user: publicUser(user) },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

export function register(req, res) {
  try {
    const { email, password, name, phone, province, district, street } = req.body ?? {}
    if ([email, password, name, phone].some((v) => typeof v !== 'string' || !v.trim())) {
      return res.status(400).json({ ok: false, error: 'Vui lòng điền đầy đủ các thông tin bắt buộc' })
    }

    const cleanEmail = email.toLowerCase().trim()
    const cleanPhone = phone.replace(/[\s.-]/g, '')
    if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ ok: false, error: 'Email không hợp lệ' })
    if (!PHONE_RE.test(cleanPhone)) return res.status(400).json({ ok: false, error: 'Số điện thoại không hợp lệ' })
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({ ok: false, error: `Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự` })
    }

    if (queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail])) {
      return res.status(409).json({ ok: false, error: 'Email này đã được đăng ký' })
    }

    run(
      `INSERT INTO users (email, name, phone, password_hash, role, province, district, street, created_at)
       VALUES (?, ?, ?, ?, 'customer', ?, ?, ?, ?)`,
      [cleanEmail, name.trim(), cleanPhone, hashPassword(password), province || null, district || null, street || null, new Date().toISOString()]
    )

    const newUser = queryOne(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`, [cleanEmail])
    return res.status(201).json({
      ok: true,
      message: 'Đăng ký tài khoản thành công',
      data: { token: tokenFor(newUser), user: publicUser(newUser) },
    })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

export function getProfile(req, res) {
  if (req.user.isApiKey) {
    return res.json({ ok: true, data: { type: 'api_key', name: req.user.name, role: req.user.role } })
  }

  const user = queryOne(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`, [req.user.email])
  if (!user) {
    return res.status(404).json({ ok: false, error: 'Không tìm thấy người dùng' })
  }
  return res.json({ ok: true, data: publicUser(user) })
}

/** Kiểm tra key đang gửi trong header x-api-key; key sai đã bị middleware authenticate chặn với mã 401. */
export function verifyApiKey(req, res) {
  if (!req.user?.isApiKey) {
    return res.status(400).json({ ok: false, error: 'Thiếu header x-api-key' })
  }
  return res.json({ ok: true, message: 'API Key hợp lệ', data: { name: req.user.name, role: req.user.role } })
}
