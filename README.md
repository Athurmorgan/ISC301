# BookWise — Nhà sách trực tuyến (React + TypeScript)

Chợ sách cũ giá rẻ cho sinh viên, phát triển từ mẫu giao diện Google Stitch. BookWise chỉ bán sách đã qua sử dụng: sách do BookWise thu mua về và sách do sinh viên tự đăng bán sau khi được duyệt hồ sơ.
Front-end React chạy được độc lập (dữ liệu lưu trong `localStorage` với tiền tố `bookwise:`), hoặc nối với backend Express + SQLite trong thư mục `backend/` để đặt hàng, đăng nhập và tra cứu đơn qua API.

## Chạy dự án

Yêu cầu Node.js 20 trở lên.

```bash
npm install
npm run dev        # mở http://localhost:5173
npm run build      # kiểm tra kiểu + đóng gói vào dist/
npm run preview    # chạy thử bản đã build
```

### Chạy kèm backend

Backend cần Node.js 22.18 trở lên (dùng `node:sqlite` có sẵn).

```bash
npm --prefix backend install
cp backend/.env.example backend/.env   # điền JWT_SECRET, các API key nếu cần
npm run server                          # API tại http://localhost:5000, tự nạp dữ liệu mẫu lần đầu
npm run server:seed                     # (tuỳ chọn) xoá và nạp lại database mẫu

cp .env.example .env.local              # VITE_API_BASE_URL=http://localhost:5000
npm run dev
```

Khi có `VITE_API_BASE_URL`:

- Mở web là đồng bộ giá và tồn kho từ máy chủ.
- Đăng nhập/đăng ký gọi `/api/auth`, lưu JWT; đặt hàng gọi `/api/orders/checkout` rồi `/process-payment`, mã đơn và tổng tiền do máy chủ tính.
- Quản trị đổi trạng thái hoặc khách huỷ đơn thì cập nhật cả máy chủ; phiếu hỗ trợ và yêu cầu thu mua cũng được gửi lên.
- Tra cứu mã đơn không có trên máy sẽ hỏi máy chủ (thông tin người nhận bị che cho tới khi nhập đúng 4 số cuối SĐT).
- Máy chủ tắt thì web tự chuyển sang chạy offline bằng `localStorage`; trang quản trị hiện trạng thái kết nối.

Tài liệu API: [`backend/docs/API_DOCUMENTATION.md`](backend/docs/API_DOCUMENTATION.md).

Muốn xoá dữ liệu demo: mở DevTools → Application → Local Storage → xoá các khoá `bookwise:*`.

## Kiến trúc MVC

```
src/
  models/        Model — logic thuần, không phụ thuộc React
                 (types, pricing, cart, order, validation, catalogQuery, report, format)
  data/          Dữ liệu khởi tạo: 49 đầu sách, danh mục, mã giảm giá, FAQ, số liệu nghiên cứu
  services/      Tầng lưu trữ: repository trên localStorage, auth, orderService, toast,
                 apiClient + syncService (gọi backend, đồng bộ sách, chuyển offline khi mất mạng)
  controllers/   Controller — custom hook nối model/service với view
                 (useCart, useOrders, useAuth, useBooks, useReport, ...)
  views/
    layout/      Header, Footer, Layout
    components/  BookCard, BookCover, OrderSummary, PaymentModal, OrderView, ui
    pages/       Mỗi route một trang
```

Nguyên tắc: view chỉ gọi controller; controller gọi service/model; model không biết gì về giao diện.
Store dùng `useSyncExternalStore` nên mọi tab, mọi component cập nhật đồng bộ.

## Nghiệp vụ chính

**1. Mua sách cũ.** Mỗi đầu sách có nhiều tin đăng (kho BookWise và các người bán), trang chi tiết liệt kê giá rẻ nhất trước. Hai tình trạng:

| Tình trạng | Kho BookWise bán | Người bán đăng tối đa | BookWise thu mua |
|---|---|---|---|
| Như mới · 95% | 55% giá bìa | 70% giá bìa | 30% giá bìa |
| Đã qua sử dụng · 80% | 40% giá bìa | 55% giá bìa | 20% giá bìa |

Nhãn "Siêu rẻ" là sách có giá từ 40% giá bìa trở xuống.

**2. Đăng ký bán sách.** Người dùng vào *Tài khoản → Kênh người bán*, khai họ tên, CCCD (kèm ảnh mặt trước), thẻ sinh viên (không bắt buộc), địa chỉ lấy sách và tài khoản ngân hàng đứng tên chính mình, rồi đồng ý quy định người bán.

**3. Admin cấp quyền bán.** Ở *Quản trị → Người bán*, admin đối chiếu giấy tờ rồi cấp quyền bán hoặc từ chối kèm lý do; người bị từ chối sửa và gửi lại được. Người bán vi phạm bị khoá quyền, mọi tin của họ bị ẩn cho đến khi được mở khoá.

**4. Đăng tin và ký gửi.** Người bán đã được duyệt đăng tin: chọn sách, tình trạng, giá (10.000đ đến giá trần), số lượng, mô tả; được sửa, tạm ẩn hoặc xoá tin. Khi có đơn, BookWise lấy sách về kiểm định rồi giao cho khách. Người bán nhận giá bán trừ 10% phí dịch vụ, tiền được tính là đã trả khi đơn giao thành công. Admin gỡ được tin sai quy định ở *Quản trị → Tin đăng*.

**5. Bán lại cho BookWise.** Người không muốn tự đăng tin có thể bán thẳng cho BookWise theo giá thu mua; sách thu mua được nhập vào kho BookWise.

## Các trang

| Đường dẫn | Nội dung |
|---|---|
| `/` | Trang chủ: sách siêu rẻ, mới về, bán chạy, ước tính giá thu mua |
| `/sach` | Danh mục: tìm kiếm, lọc thể loại/tình trạng/giá, sắp xếp |
| `/sach/:id` | Chi tiết: chọn tình trạng (Như mới / Đã dùng), chọn người bán, số lượng, đánh giá, mua kèm |
| `/gio-hang` | Giỏ hàng, mã giảm giá |
| `/thanh-toan` | Địa chỉ, vận chuyển, phương thức thanh toán |
| `/don-hang` | Tra cứu và theo dõi đơn |
| `/tai-khoan` | Đăng nhập/đăng ký, quên/đổi mật khẩu, lịch sử đơn, sách yêu thích, kênh người bán (đăng ký, tin đăng, doanh thu), bán lại cho BookWise, phiếu hỗ trợ |
| `/quan-tri` | Quản trị: thống kê trực tiếp, đơn hàng, kho sách, duyệt người bán, tin đăng, thu mua sách cũ, mã giảm giá, khách hàng, đánh giá, phiếu hỗ trợ |
| `/ho-tro` | FAQ và gửi yêu cầu hỗ trợ / bán lại sách |
| `/bao-cao` | Báo cáo doanh số thật + nghiên cứu thị trường, trình chiếu, in PDF |

## Thống kê trực tiếp (trang quản trị)

Tab **Trực tiếp** làm mới mỗi 3 giây. Mỗi chỉ số có nhãn nguồn:

- **Thật:** đơn hôm nay, doanh thu, đơn theo giờ, đơn mới nhất (đặt đơn ở tab khác là hiện ngay kèm thông báo), các tab BookWise đang mở trên cùng trình duyệt (qua BroadcastChannel).
- **Mô phỏng:** người online, phiên, lượt xem, hành trình mua hàng, nguồn truy cập, khu vực, thiết bị, hoạt động trực tiếp. Các số này được sinh theo đường cong lưu lượng trong ngày (`src/models/live.ts`).

Dải chữ chạy đầu trang (`src/models/announcements.ts`) tự tính sách bán chạy nhất tháng, ưu đãi sâu nhất, top từng thể loại và sách được đánh giá cao nhất.

## Dữ liệu demo

- **Quản trị viên:** `admin@bookwise.vn` / `admin123`
- **Người bán sinh viên (đã duyệt):** `sinhvien@bookwise.vn` / `sinhvien123`
- **Mã giảm giá:** `BOOKWISE50K` (−50.000đ, đơn từ 200.000đ), `GIAM10` (−10%, tối đa 30.000đ, đơn từ 100.000đ), `FREESHIP15K` (−15.000đ phí giao, đơn từ 150.000đ)
- **Vận chuyển:** Tiêu chuẩn 15.000đ; Hoả tốc 30.000đ chỉ ở Hà Nội và TP. Hồ Chí Minh
- **Thẻ thử:** `4111 1111 1111 1111`, hạn bất kỳ trong tương lai, CVV 3 số, OTP `123456`
- **Quên mật khẩu:** OTP demo `123456`
- **Tra cứu đơn của người khác:** thông tin người nhận bị che, nhập 4 số cuối SĐT để xem đầy đủ
- VietQR / ví điện tử / COD đều được giả lập

## Kịch bản demo (khoảng 5 phút)

1. Trang chủ → tìm "tâm lý" → mở một cuốn → chọn "Như mới", số lượng 2 → Thêm vào giỏ.
2. Giỏ hàng → nhập `BOOKWISE50K` → Thanh toán.
3. Chọn TP. Hồ Chí Minh → Hoả tốc → Thẻ → nhập thẻ thử + OTP → nhận mã đơn `BW-xxxxxx`.
4. Đăng nhập quản trị → tab Đơn hàng → Xác nhận → Giao hàng.
5. Quay lại `/don-hang` với mã đơn: dòng thời gian đã cập nhật.
6. `/bao-cao`: doanh thu tính từ đơn vừa đặt; bấm "Trình chiếu tóm tắt".

**Luồng người bán:**

1. Đăng ký một tài khoản mới → *Tài khoản → Kênh người bán* → điền hồ sơ, tải ảnh CCCD → Gửi hồ sơ.
2. Đăng nhập quản trị → tab *Người bán* → mở hồ sơ → *Cấp quyền bán*.
3. Quay lại tài khoản người bán → *Đăng tin*: chọn sách, tình trạng, giá dưới mức trần → Đăng.
4. Mở trang sách đó: tin mới hiện trong danh sách người bán; mua bằng một tài khoản khác.
5. Quản trị chuyển đơn sang *Đã giao* → bảng doanh thu của người bán chuyển khoản tiền sang *Đã nhận*.
