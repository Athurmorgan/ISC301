import { queryAll, queryOne, run, transaction } from '../db.js'
import { setSellerSuspended } from '../lib/listings.js'

/**
 * Sàn người bán: người dùng gửi hồ sơ định danh (CCCD, tài khoản ngân hàng đứng tên chính mình),
 * admin đối chiếu giấy tờ rồi cấp quyền bán. Chỉ người bán đã được duyệt mới đăng tin được.
 */

/** Trạng thái kế tiếp admin được chọn */
const NEXT_STATUS = {
  pending: ['approved', 'rejected'],
  approved: ['suspended'],
  rejected: [],
  suspended: ['approved'],
}

/** Bỏ dấu, viết hoa như tên chủ tài khoản ngân hàng: "Trần Thu Hà" → "TRAN THU HA" */
const bankName = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()

const maskId = (id) => (id.length > 8 ? `${id.slice(0, 4)}${'•'.repeat(id.length - 8)}${id.slice(-4)}` : id)

/** `full` = true cho chủ hồ sơ và admin xem chi tiết; danh sách thì che số CCCD và số tài khoản */
function toApplication(row, { full = false } = {}) {
  if (!row) return null
  return {
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    idNumber: full ? row.id_number : maskId(row.id_number),
    school: row.school ?? '',
    pickupAddress: row.pickup_address,
    bankName: row.bank_name,
    bankAccount: full ? row.bank_account : `••••${row.bank_account.slice(-4)}`,
    accountHolder: row.account_holder,
    hasStudentCard: !!row.has_student_card,
    status: row.status,
    reason: row.reason ?? undefined,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at ?? undefined,
    history: queryAll('SELECT status, note, created_at AS at FROM seller_history WHERE seller_email = ? ORDER BY created_at ASC, id ASC', [row.email]),
  }
}

/** Kiểm tra hồ sơ giống front-end (src/models/seller.ts) */
function validate(b) {
  const errors = {}
  if (String(b.fullName ?? '').trim().split(/\s+/).length < 2) errors.fullName = 'Nhập họ tên đầy đủ như trên CCCD'
  if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(String(b.phone ?? '').replace(/[\s.]/g, ''))) errors.phone = 'Số điện thoại chưa đúng'
  if (!/^0\d{11}$/.test(String(b.idNumber ?? '').trim())) errors.idNumber = 'Số CCCD gồm 12 chữ số, bắt đầu bằng 0'
  if (String(b.pickupAddress ?? '').trim().length < 8) errors.pickupAddress = 'Nhập địa chỉ để BookWise đến lấy sách'
  if (String(b.bankName ?? '').trim().length < 2) errors.bankName = 'Nhập tên ngân hàng'
  if (!/^\d{6,19}$/.test(String(b.bankAccount ?? '').replace(/\s/g, ''))) errors.bankAccount = 'Số tài khoản 6–19 chữ số'
  if (!String(b.accountHolder ?? '').trim()) errors.accountHolder = 'Nhập tên chủ tài khoản'
  else if (bankName(b.accountHolder) !== bankName(b.fullName)) errors.accountHolder = 'Tài khoản phải đứng tên chính người đăng ký'
  if (b.hasStudentCard && String(b.school ?? '').trim().length < 3) errors.school = 'Nhập tên trường trên thẻ sinh viên'
  return errors
}

/**
 * Gửi (hoặc gửi lại sau khi bị từ chối) hồ sơ đăng ký bán sách
 */
export function applySeller(req, res) {
  try {
    const email = req.user.email
    const body = req.body ?? {}
    const current = queryOne('SELECT * FROM seller_applications WHERE email = ?', [email])
    if (current && current.status !== 'rejected') {
      return res.status(409).json({ ok: false, error: 'Bạn đã gửi hồ sơ, vui lòng chờ BookWise phản hồi' })
    }
    const errors = validate(body)
    if (Object.keys(errors).length) {
      return res.status(400).json({ ok: false, error: 'Hồ sơ còn thiếu hoặc sai thông tin', errors })
    }
    const idNumber = String(body.idNumber).trim()
    if (queryOne('SELECT email FROM seller_applications WHERE id_number = ? AND email != ?', [idNumber, email])) {
      return res.status(409).json({ ok: false, error: 'Số CCCD này đã được dùng cho một tài khoản người bán khác' })
    }

    const now = new Date().toISOString()
    const values = [
      String(body.fullName).trim(),
      String(body.phone).trim(),
      idNumber,
      String(body.school ?? '').trim() || null,
      String(body.pickupAddress).trim(),
      String(body.bankName).trim(),
      String(body.bankAccount).replace(/\s/g, ''),
      bankName(body.accountHolder),
      body.hasStudentCard ? 1 : 0,
      now,
      email,
    ]
    transaction(() => {
      if (current) {
        run(
          `UPDATE seller_applications SET full_name = ?, phone = ?, id_number = ?, school = ?, pickup_address = ?, bank_name = ?,
             bank_account = ?, account_holder = ?, has_student_card = ?, submitted_at = ?, status = 'pending', reason = NULL, reviewed_at = NULL
           WHERE email = ?`,
          values
        )
      } else {
        run(
          `INSERT INTO seller_applications (full_name, phone, id_number, school, pickup_address, bank_name, bank_account, account_holder, has_student_card, submitted_at, email, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          values
        )
      }
      run(`INSERT INTO seller_history (seller_email, status, note, created_at) VALUES (?, 'pending', ?, ?)`, [
        email,
        current ? 'Gửi lại hồ sơ' : 'Gửi hồ sơ đăng ký bán sách',
        now,
      ])
    })

    const saved = queryOne('SELECT * FROM seller_applications WHERE email = ?', [email])
    return res.status(201).json({ ok: true, message: 'Đã gửi hồ sơ. BookWise sẽ duyệt trong 1–2 ngày làm việc', data: toApplication(saved, { full: true }) })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Hồ sơ người bán của chính mình (null nếu chưa đăng ký)
 */
export function getMyApplication(req, res) {
  try {
    const row = queryOne('SELECT * FROM seller_applications WHERE email = ?', [req.user.email])
    return res.json({ ok: true, data: toApplication(row, { full: true }) })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Danh sách hồ sơ cho admin, lọc theo ?status=
 */
export function getApplications(req, res) {
  try {
    const { status } = req.query
    const rows = status
      ? queryAll('SELECT * FROM seller_applications WHERE status = ? ORDER BY submitted_at DESC', [status])
      : queryAll('SELECT * FROM seller_applications ORDER BY submitted_at DESC')
    return res.json({ ok: true, data: rows.map((r) => toApplication(r)) })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Admin xem chi tiết một hồ sơ để đối chiếu giấy tờ
 */
export function getApplication(req, res) {
  try {
    const row = queryOne('SELECT * FROM seller_applications WHERE email = ?', [String(req.params.email).toLowerCase()])
    if (!row) return res.status(404).json({ ok: false, error: 'Không tìm thấy hồ sơ' })
    return res.json({ ok: true, data: toApplication(row, { full: true }) })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}

/**
 * Admin duyệt / từ chối / khoá / mở khoá người bán.
 * Khoá thì mọi tin đang bán của người đó bị ẩn; mở khoá thì hiện lại.
 */
export function reviewApplication(req, res) {
  try {
    const email = String(req.params.email).toLowerCase()
    const { status, note = '' } = req.body ?? {}
    const row = queryOne('SELECT * FROM seller_applications WHERE email = ?', [email])
    if (!row) return res.status(404).json({ ok: false, error: 'Không tìm thấy hồ sơ' })
    if (!NEXT_STATUS[row.status]?.includes(status)) {
      return res.status(400).json({ ok: false, error: `Không thể chuyển hồ sơ từ "${row.status}" sang "${status}"` })
    }
    const reason = String(note).trim().slice(0, 300)
    if (status !== 'approved' && !reason) {
      return res.status(400).json({ ok: false, error: 'Cần ghi lý do khi từ chối hoặc khoá người bán' })
    }

    const now = new Date().toISOString()
    const defaultNote = row.status === 'suspended' ? 'Mở khoá quyền bán' : 'Hồ sơ hợp lệ, đã cấp quyền bán'
    transaction(() => {
      run('UPDATE seller_applications SET status = ?, reason = ?, reviewed_at = ? WHERE email = ?', [status, reason || null, now, email])
      run('INSERT INTO seller_history (seller_email, status, note, created_at) VALUES (?, ?, ?, ?)', [email, status, reason || defaultNote, now])
      if (status === 'suspended') setSellerSuspended(email, true, now)
      if (status === 'approved' && row.status === 'suspended') setSellerSuspended(email, false, now)
    })

    const updated = queryOne('SELECT * FROM seller_applications WHERE email = ?', [email])
    return res.json({ ok: true, message: 'Đã cập nhật hồ sơ người bán', data: toApplication(updated, { full: true }) })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }
}
