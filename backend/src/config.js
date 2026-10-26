import 'dotenv/config'
import crypto from 'node:crypto'

// Cấu hình đọc từ backend/.env (xem .env.example). Không có giá trị mặc định cho khoá bí mật:
// thiếu JWT_SECRET thì sinh khoá ngẫu nhiên cho phiên chạy này, thiếu API key nào thì key đó bị tắt.

const isProduction = process.env.NODE_ENV === 'production'

let jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  if (isProduction) throw new Error('Thiếu JWT_SECRET trong biến môi trường')
  jwtSecret = crypto.randomBytes(32).toString('hex')
  console.warn('⚠️  Chưa đặt JWT_SECRET, dùng khoá tạm: mọi token sẽ mất hiệu lực khi khởi động lại server')
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  isProduction,
  jwtSecret,
  /** Các origin được phép gọi API, phân tách bằng dấu phẩy. Bỏ trống = cho phép mọi origin (chỉ nên dùng khi dev). */
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  apiKeys: {
    admin: process.env.ADMIN_API_KEY || null,
    partner: process.env.PARTNER_API_KEY || null,
    client: process.env.PUBLIC_API_KEY || null,
  },
}
