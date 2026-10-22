export interface Faq {
  group: string
  q: string
  a: string
}

export const FAQS: Faq[] = [
  {
    group: 'Giao hàng',
    q: 'Bao lâu thì tôi nhận được sách?',
    a: 'Giao tiêu chuẩn qua GHN hoặc Viettel Post mất 2–3 ngày làm việc trên toàn quốc. Tại Hà Nội và TP. Hồ Chí Minh, bạn có thể chọn giao hỏa tốc qua AhaMove, nhận sách trong khoảng 2 giờ kể từ khi đơn được xác nhận.',
  },
  {
    group: 'Giao hàng',
    q: 'Phí giao hàng được tính thế nào?',
    a: 'Giao tiêu chuẩn 15.000đ, hỏa tốc 30.000đ. Mã FREESHIP15K giảm 15.000đ phí giao cho đơn từ 150.000đ và có thể dùng cùng một mã giảm giá đơn hàng.',
  },
  {
    group: 'Tình trạng sách',
    q: '“Như mới 98%” và “Đã qua sử dụng 90%” khác nhau ra sao?',
    a: 'Sách “Như mới” thường chỉ được đọc một lần: gáy thẳng, không ghi chú, không gấp mép. Sách “Đã qua sử dụng” có thể ngả màu giấy hoặc trầy nhẹ bìa nhưng nội dung đầy đủ, không rách trang. Mọi cuốn đều qua kiểm định 7 bước trước khi lên kệ.',
  },
  {
    group: 'Tình trạng sách',
    q: 'Làm sao tôi biết sách không phải sách lậu?',
    a: 'BookWise chỉ nhập sách mới từ nhà phát hành chính thức. Sách cũ được đối chiếu ISBN, chất lượng in, giấy và tem nhà phát hành. Nếu phát hiện sách giả, chúng tôi hoàn 200% giá trị cuốn sách.',
  },
  {
    group: 'Đổi trả',
    q: 'Tôi có thể đổi trả sách không?',
    a: 'Bạn có 7 ngày kể từ khi nhận hàng để đổi trả nếu sách không đúng tình trạng mô tả, lỗi in hoặc hư hỏng do vận chuyển. Hãy gửi yêu cầu kèm mã đơn trong mục Hỗ trợ, chúng tôi phản hồi trong 24 giờ.',
  },
  {
    group: 'Thanh toán',
    q: 'BookWise hỗ trợ những hình thức thanh toán nào?',
    a: 'Chuyển khoản VietQR (quét bằng ứng dụng ngân hàng bất kỳ, số tiền điền sẵn), ví MoMo/ZaloPay, thẻ ATM/Visa/Mastercard có xác thực OTP và thanh toán khi nhận hàng (COD) được kiểm tra sách trước.',
  },
  {
    group: 'Thanh toán',
    q: 'Tôi đã chuyển khoản nhưng đơn vẫn “Chờ xác nhận”?',
    a: 'Đơn được xác nhận sau khi BookWise kiểm tra tồn kho và đối soát giao dịch, thường trong vòng 30 phút giờ hành chính. Nếu sau 2 giờ vẫn chưa thay đổi, hãy gửi yêu cầu hỗ trợ kèm mã đơn.',
  },
  {
    group: 'Đơn hàng',
    q: 'Làm sao để huỷ đơn?',
    a: 'Bạn tự huỷ được khi đơn còn ở trạng thái “Chờ xác nhận”, ngay trong trang Tra cứu đơn hoặc Tài khoản. Đơn đã xác nhận cần liên hệ bộ phận hỗ trợ. Khi huỷ, tiền đã thanh toán được hoàn trong 1–3 ngày làm việc.',
  },
  {
    group: 'Đơn hàng',
    q: 'Tôi không nhớ mã đơn hàng?',
    a: 'Trong trang Tra cứu đơn, bạn có thể tìm bằng số điện thoại đã dùng khi đặt hàng. Nếu đăng nhập, toàn bộ đơn hàng nằm trong mục Tài khoản.',
  },
  {
    group: 'Bán lại sách',
    q: 'BookWise thu mua sách cũ như thế nào?',
    a: 'Nhập tên sách ở mục “Bán lại sách cũ” trên trang chủ để xem giá thu mua ước tính: 45% giá bán với sách như mới, 30% với sách đã qua sử dụng. Gửi yêu cầu, chúng tôi đến lấy tận nhà và chuyển khoản trong 24 giờ sau khi kiểm định.',
  },
]
