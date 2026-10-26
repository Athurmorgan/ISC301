# BookWise Backend API Documentation

Hệ thống Backend REST API hoàn chỉnh cho dự án **BookWise**, phục vụ 3 luồng nghiệp vụ trọng tâm, đi kèm bộ cơ sở dữ liệu mẫu thực tế và xác thực bằng **JWT** hoặc **API key** cấu hình qua biến môi trường.

---

## 1. Xác thực và phân quyền

Có hai cách gọi các API cần quyền:

1. **JWT** (dùng cho web và khách hàng): gọi `POST /api/auth/login` để nhận token, sau đó gửi kèm
   ```http
   Authorization: Bearer <TOKEN>
   ```
   Token có hạn 7 ngày, ký bằng `JWT_SECRET` trong `backend/.env`.
2. **API key** (dùng cho hệ thống khác gọi trực tiếp, không cần giao diện): chỉ nhận qua header
   ```http
   x-api-key: <KEY>
   ```
   Key **không** còn viết cứng trong mã và không nhận qua query string (`?api_key=` dễ lộ trong log). Đặt key trong `backend/.env`:
   `ADMIN_API_KEY` (quyền admin), `PARTNER_API_KEY` (đối tác giao hàng), `PUBLIC_API_KEY` (client). Biến nào để trống thì key đó bị tắt.
   Có thể cấp thêm key riêng bằng cách thêm dòng vào bảng `api_keys`.

Tạo nhanh một chuỗi ngẫu nhiên cho `JWT_SECRET` hoặc key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Quyền theo nhóm API

| Nhóm | Ai được gọi |
|---|---|
| Danh mục sách, FAQ, tính giỏ hàng, đặt hàng, gửi ticket, đăng ký thu mua | Ai cũng gọi được |
| `GET /api/orders/track/:code` | Ai cũng gọi được, nhưng tên/SĐT/địa chỉ bị che trừ khi là admin, chủ đơn, hoặc gửi kèm `?phone=` khớp 4 số cuối |
| `POST /api/orders/:code/cancel` | Admin, chủ đơn, hoặc gửi `phone` khớp đầy đủ SĐT người nhận; chỉ huỷ được đơn `pending` |
| `POST /api/orders/lookup` | Ai cũng gọi được, kết quả bị che với người không phải nhân viên |
| `GET /api/orders/my-orders`, `GET /api/buybacks` | Cần đăng nhập (khách chỉ thấy dữ liệu của mình) |
| Dashboard, `GET /api/orders`, đổi trạng thái đơn, danh sách/trả lời ticket, quản lý sách, duyệt thu mua | Chỉ admin |
| Điều phối và cập nhật giao hàng | Admin hoặc đối tác (`partner`) |

### Quy tắc nghiệp vụ máy chủ tự kiểm tra
- Giá luôn tính lại trên máy chủ: bản seal = giá deal (nếu có) hoặc giá bán; như mới = 80%, đã dùng = 60%, làm tròn nghìn.
- Tồn kho tính chung cho mọi tình trạng của một đầu sách; số lượng mỗi dòng từ 1 đến 99.
- Mỗi nhóm mã giảm giá (giảm đơn / giảm phí giao) chỉ áp một mã; giảm không vượt quá tạm tính hoặc phí giao.
- Thanh toán lấy phương thức đã chọn lúc đặt đơn; thẻ cần OTP thử `123456`; VietQR gửi `confirm: true` để xác nhận đã chuyển; đơn đã thanh toán gọi lại sẽ nhận 409.
- Trạng thái đơn chỉ đi theo thứ tự `pending → confirmed → shipping → delivered`, huỷ được khi còn `pending` hoặc `confirmed` (hoàn lại kho).

---

## 2. Bộ Cơ Sở Dữ Liệu Mẫu (Sample Database)

Bộ dữ liệu mẫu được lưu trữ đa định dạng trong thư mục [backend/data/](../data/):

1. **File SQLite:** [bookwise.sqlite](../data/bookwise.sqlite) — Dữ liệu quan hệ chuẩn, chạy trực tiếp với `node:sqlite` (không cần cài database server).
2. **File Dump JSON:** [sample_database.json](../data/sample_database.json) — Xuất toàn bộ 16 bảng dữ liệu sang JSON để dễ dàng kiểm tra trực quan hoặc import vào NoSQL/MongoDB/Firebase.
3. **File Schema SQL:** [schema.sql](../data/schema.sql) — Cấu trúc DDL với ràng buộc khóa ngoại, chỉ mục hiệu năng.

### Dữ Liệu Sẵn Có Khi Khởi Tạo:
- **49 Đầu sách thật**: Phân chia theo 4 danh mục (`kinh-te`, `ky-nang`, `van-hoc`, `khoa-hoc`), giá bìa, giá khuyến mãi deal, tồn kho, ảnh bìa gốc.
- **5 Đơn hàng mẫu**: Đầy đủ các trạng thái (`pending`, `confirmed`, `shipping`, `delivered`, `cancelled`).
- **3 Vận đơn giao hàng**: Tích hợp mã vận đơn AhaMove, GHN, Viettel Post kèm shipper và trạm kiểm soát (checkpoints).
- **3 Phiếu hỗ trợ CSKH**: Bao gồm ticket đang mở, ticket đã được tư vấn viên giải quyết, liên kết với mã đơn hàng.
- **3 Giao dịch thu mua sách cũ (Buyback)**: Có tài khoản ngân hàng nhận tiền và dòng trạng thái thẩm định.
- **Mã giảm giá mẫu**: `BOOKWISE50K` (-50k), `GIAM10` (-10%), `FREESHIP15K` (-15k ship).
- **Tài khoản mẫu**:
  - Quản trị: `admin@bookwise.vn` / `admin123`
  - Khách hàng: `nguyenvanan@gmail.com` / `customer123`

---

## 3. Ba Luồng Nghiệp Vụ Trọng Tâm

### Luồng 1: Chăm sóc khách hàng kết hợp Dashboard và Giao hàng

#### 1.1 Chăm Sóc Khách Hàng (Customer Support / CRM)
- `GET /api/support/tickets`: Lấy danh sách ticket (hỗ trợ query filter: `status=open|resolved`, `topic`, `search`, `orderCode`).
- `GET /api/support/tickets/:code`: Chi tiết ticket kèm phản hồi của tư vấn viên.
- `POST /api/support/tickets`: Khách tạo ticket khiếu nại hoặc hỏi đáp về đơn hàng.
- `PATCH /api/support/tickets/:code/reply`: CSKH hoặc Admin trả lời ticket và đổi trạng thái (chỉ admin).
- `GET /api/support/faqs`: Danh sách câu hỏi thường gặp theo danh mục.
- `GET /api/support/reviews`: Đánh giá sách từ khách hàng.
- `POST /api/support/reviews`: Khách hàng đánh giá sách (tự động gắn cờ `verifiedPurchase` nếu đã mua thành công).

#### 1.2 Dashboard Quản Trị & Vận Hành
- `GET /api/dashboard/summary`: KPI tổng hợp gồm: Tổng doanh thu, doanh thu đã giao, doanh thu hôm nay, phân bổ trạng thái đơn hàng, cảnh báo tồn kho, số ticket CSKH mở, tỷ lệ giải quyết khiếu nại.
- `GET /api/dashboard/revenue-trend`: Dữ liệu xu hướng doanh thu và số lượng đơn hàng theo ngày.
- `GET /api/dashboard/top-books`: Top sách bán chạy nhất và doanh thu tạo ra.
- `GET /api/dashboard/inventory-alerts`: Cảnh báo sách sắp hết hàng (`stock <= 10`).
- `GET /api/dashboard/support-kpi`: Thống kê phân loại chủ đề khiếu nại và độ hài lòng khách hàng.
- `GET /api/dashboard/live`: Dữ liệu lưu lượng truy cập trực tiếp mô phỏng theo giờ trong ngày.

#### 1.3 Giao Hàng & Logistics (Delivery)
- `GET /api/delivery/methods`: Danh sách hình thức giao hàng (Tiêu chuẩn 15k, Hỏa tốc 30k).
- `GET /api/delivery/carriers`: Thông tin các đối tác vận chuyển tích hợp (AhaMove, GHN, Viettel Post).
- `GET /api/delivery/track/:trackingCode`: Tra cứu hành trình vận chuyển chi tiết theo mã vận đơn (checkpoints, shipper, trạng thái hiện tại).
- `POST /api/delivery/dispatch`: Xuất kho đơn hàng, tạo mã vận đơn (`AHA-BW-...`, `GHN-VN-...`, `VTP-BW-...`), chỉ định shipper và ĐVVC.
- `POST /api/delivery/update-status`: Webhook từ ĐVVC cập nhật trạm kiểm soát mới (tự động cập nhật trạng thái đơn hàng sang `delivered` khi giao thành công).

---

### Luồng 2: Mua bán sách, giao dịch

#### 2.1 Danh Mục & Quản Lý Kho Sách
- `GET /api/books`: Danh sách sách với bộ lọc: `category`, `condition` (`seal`, `likenew`, `used`), `search`, `minPrice`, `maxPrice`, `sort` (`bestseller`, `rating`, `price_asc`, `price_desc`, `newest`), phân trang `page` & `limit`.
- `GET /api/books/:id`: Chi tiết cuốn sách kèm bảng giá chiết khấu cho 3 tình trạng, đánh giá gần nhất và sách mua kèm.
- `POST /api/books`: Thêm sách mới (chỉ admin).
- `PUT /api/books/:id`: Cập nhật giá bán, giá deal, số lượng tồn kho.
- `DELETE /api/books/:id`: Xóa sách khỏi kho.

#### 2.2 Giao Dịch Mua Sách (Cart & Checkout)
- `POST /api/orders/apply-coupon`: Kiểm tra và tính số tiền giảm giá của voucher (`BOOKWISE50K`, `GIAM10`, `FREESHIP15K`).
- `POST /api/orders/calculate-cart`: Tính toán tổng tiền giỏ hàng gồm tạm tính, chiết khấu voucher, phí vận chuyển và miễn giảm vận chuyển.
- `POST /api/orders/checkout`: **Đặt hàng giao dịch**:
  - Trừ kho tức thời và an toàn (Stock reservation).
  - Sinh mã đơn hàng duy nhất `BW-xxxxxx`.
  - Lưu chi tiết mặt hàng và lịch sử sự kiện khởi tạo.
- `POST /api/orders/process-payment`: Giả lập và xác thực thanh toán:
  - `vietqr`: Trả về QR link và payload chuyển khoản MB Bank có sẵn nội dung chuyển tiền.
  - `card`: Kiểm tra mã OTP thẻ (OTP test: `123456`).
  - `cod`: Xác nhận giao dịch thanh toán khi nhận hàng.

#### 2.3 Giao Dịch Thu Mua Sách Cũ (Buyback Transactions)
- `POST /api/buybacks/estimate`: Định giá tự động sách cũ theo tình trạng (`likenew` 45% giá bìa, `used` 30% giá bìa).
- `POST /api/buybacks`: Khách hàng đăng ký bán lại sách kèm số tài khoản ngân hàng nhận tiền.
- `GET /api/buybacks`: Danh sách các yêu cầu bán lại sách cũ.
- `PATCH /api/buybacks/:code/status`: Admin thẩm định sách, cập nhật trạng thái (`collecting` -> `inspecting` -> `paid`), giải ngân tiền vào tài khoản khách và tự động nhập lại vào kho sách cũ.

---

### Luồng 3: Theo dõi đơn hàng (Order Tracking)

- `GET /api/orders/track/:code`: **Tra cứu đơn hàng trực tiếp**: Nhập mã đơn `BW-xxxxxx`, trả về toàn bộ mặt hàng, tổng tiền, phương thức thanh toán, tiến độ dòng thời gian (timeline), thông tin bưu tá và trạm kiểm soát giao hàng.
- `POST /api/orders/lookup`: **Tra cứu qua SĐT hoặc Email**: Khách không cần đăng nhập vẫn tra cứu được toàn bộ các đơn hàng đã đặt của mình.
- `POST /api/orders/:code/cancel`: **Khách hàng tự huỷ đơn**: Cho phép hủy đơn nếu đơn đang ở trạng thái `pending`. Hệ thống tự động **hoàn lại số lượng tồn kho** (release stock).
- `GET /api/orders/my-orders`: Lịch sử đơn hàng của tài khoản đã đăng nhập.
- `PATCH /api/orders/:code/status`: Cập nhật trạng thái đơn hàng (`pending` -> `confirmed` -> `shipping` -> `delivered` / `cancelled`) kèm ghi chú (Dành cho Quản trị hoặc Bưu tá giao nhận).

---

## 4. Hướng Dẫn Chạy & Thử Nghiệm

### Chạy Backend Server
```bash
# Từ thư mục gốc project:
npm run server

# Hoặc từ thư mục backend:
cd backend
npm start
```
Server sẽ chạy tại: **http://localhost:5000**

### Nạp Lại Dữ Liệu Mẫu (Reset Database)
```bash
# Từ thư mục gốc:
npm run server:seed
```

### Import Postman Collection
- Mở Postman hoặc Thunder Client trong VSCode.
- Bấm **Import** và chọn file:
  [backend/docs/BookWise_API_Collection.json](../docs/BookWise_API_Collection.json)
- Điền biến `token` (lấy từ đăng nhập) hoặc `apiKeyAdmin` (giá trị `ADMIN_API_KEY` trong `.env`) trước khi gọi các API quản trị.

---

## 5. Ví Dụ cURL Test Nhanh

### 1. Đăng nhập và xem Dashboard (Luồng 1)
```bash
curl -X POST http://localhost:5000/api/auth/login   -H "Content-Type: application/json"   -d '{"email":"admin@bookwise.vn","password":"admin123"}'

curl http://localhost:5000/api/dashboard/summary -H "Authorization: Bearer <TOKEN>"
```

### 2. Tra Cứu Đơn Hàng (Luồng 3)
```bash
curl http://localhost:5000/api/orders/track/BW-100582
```

### 3. Đặt Hàng Mới (Luồng 2)
```bash
curl -X POST http://localhost:5000/api/orders/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Nguyễn Văn Test",
      "phone": "0912345678",
      "email": "test@bookwise.vn",
      "province": "TP. Hồ Chí Minh",
      "district": "Quận 1",
      "street": "12 Lê Lợi"
    },
    "items": [
      { "bookId": "tam-ly-hoc-ve-tien", "condition": "seal", "qty": 1 }
    ],
    "shippingId": "standard",
    "paymentId": "cod"
  }'
```

### 4. Gọi API Quản Trị bằng API Key (Không Cần Frontend)
```bash
curl http://localhost:5000/api/orders \
  -H "x-api-key: $ADMIN_API_KEY"
```
