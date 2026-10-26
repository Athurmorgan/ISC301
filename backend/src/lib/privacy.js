// Che thông tin cá nhân khi người xem không phải chủ đơn hoặc quản trị viên.

export const digits = (s) => String(s ?? '').replace(/\D/g, '').replace(/^84/, '0')

export function maskPhone(p) {
  const d = digits(p)
  return d.length < 6 ? '***' : `${d.slice(0, 3)}****${d.slice(-3)}`
}

export function maskName(name) {
  return String(name ?? '')
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w : `${w[0]}**`))
    .join(' ')
}

export function maskEmail(email) {
  if (!email) return email
  const [user, domain] = String(email).split('@')
  return `${user.slice(0, 2)}***@${domain ?? ''}`
}

export const maskStreet = (street) => (street && street.length > 5 ? `***${street.slice(-5)}` : '***')

export const maskAccount = (acc) => {
  const d = String(acc ?? '')
  return d.length > 4 ? `****${d.slice(-4)}` : '****'
}

/** Người xem có quyền thấy đầy đủ đơn hàng không: admin, chủ tài khoản, hoặc nhập đúng 4 số cuối SĐT. */
export function canSeeOrder(user, order, phoneHint) {
  if (user?.role === 'admin' || user?.role === 'partner' || isOwner(user, order)) return true
  const hint = digits(phoneHint)
  return hint.length >= 4 && digits(order.customer_phone).endsWith(hint)
}

export function maskOrder(order) {
  return {
    ...order,
    customer_name: maskName(order.customer_name),
    customer_phone: maskPhone(order.customer_phone),
    customer_email: maskEmail(order.customer_email),
    customer_street: maskStreet(order.customer_street),
    user_email: order.user_email ? maskEmail(order.user_email) : null,
    note: order.note ? '*** (đã ẩn)' : order.note,
    masked: true,
  }
}

/** So khớp đầy đủ số điện thoại (bỏ khoảng trắng, chấp nhận +84) — dùng cho thao tác thay đổi như huỷ đơn. */
export const samePhone = (a, b) => digits(a).length >= 9 && digits(a) === digits(b)

export const isOwner = (user, order) => {
  const email = user?.email?.toLowerCase()
  return !!email && (email === order.user_email?.toLowerCase() || email === order.customer_email?.toLowerCase())
}
