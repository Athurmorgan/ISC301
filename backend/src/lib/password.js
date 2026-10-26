import crypto from 'node:crypto'

// Mật khẩu lưu dạng "scrypt$<salt>$<hash>". Bản cũ là sha256 không salt: vẫn đăng nhập được
// và được băm lại theo scrypt ngay lần đăng nhập đúng đầu tiên.

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored) return false
  if (stored.startsWith('scrypt$')) {
    const [, salt, hash] = stored.split('$')
    const actual = crypto.scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return expected.length === actual.length && crypto.timingSafeEqual(actual, expected)
  }
  const legacy = crypto.createHash('sha256').update(password).digest('hex')
  return legacy.length === stored.length && crypto.timingSafeEqual(Buffer.from(legacy), Buffer.from(stored))
}

export const needsRehash = (stored) => !stored?.startsWith('scrypt$')
