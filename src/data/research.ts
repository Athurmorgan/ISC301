// Nội dung báo cáo nghiên cứu thị trường (khảo sát của nhóm dự án, Q1–Q3/2024).
// Tách khỏi view để có thể cập nhật số liệu mà không động vào giao diện.

export const METHODOLOGY = [
  { value: '3.500', label: 'độc giả khảo sát định lượng', note: 'Hà Nội, TP. HCM, Đà Nẵng' },
  { value: '120', label: 'phỏng vấn chuyên sâu', note: 'người mua và người bán sách cũ' },
  { value: 'Q1–Q3', label: 'năm 2024', note: 'thời gian thu thập dữ liệu' },
]

export const MARKET_KPIS = [
  { value: '4.500+', unit: 'tỷ đồng/năm', label: 'Quy mô thị trường sách Việt Nam', note: '38% giao dịch qua TMĐT, tăng trưởng kép 19,8%/năm' },
  { value: '73,4', unit: '%', label: 'Sẵn lòng mua sách cũ chất lượng tốt', note: 'Lý do chính: tiết kiệm 45–60% so với giá bìa' },
  { value: '62,8', unit: '%', label: 'Từng mua phải sách lậu trên sàn', note: '84% trong số đó để lại đánh giá tiêu cực' },
  { value: '16,5', unit: 'cuốn/hộ', label: 'Sách “đóng băng” trên kệ mỗi gia đình', note: '91% muốn bán lại — hơn 120 triệu cuốn trên toàn quốc' },
]

export interface Bar {
  label: string
  value: number
}

export const DELIVERY_EXPECTATION: Bar[] = [
  { label: 'Trong 2–4 giờ', value: 64.2 },
  { label: 'Trong ngày', value: 28.5 },
  { label: '3–5 ngày như hiện nay', value: 7.3 },
]

export const DELIVERY_OCCASION: Bar[] = [
  { label: 'Mua làm quà gấp', value: 38 },
  { label: 'Cần cho học tập, thi cử', value: 32 },
  { label: 'Theo trend TikTok', value: 21 },
  { label: 'Đọc cuối tuần', value: 9 },
]

export const DELIVERY_FACTS = [
  { value: '71,6%', label: 'chấp nhận trả thêm 25–35 nghìn cho giao 2 giờ' },
  { value: '88,4%', label: 'mua ngay nếu được freeship 2 giờ cho đơn từ 150 nghìn' },
]

export const BUYER_CRITERIA: Bar[] = [
  { label: 'Cam kết sách thật', value: 34 },
  { label: 'Giá tương xứng tình trạng', value: 29 },
  { label: 'Tốc độ giao hàng', value: 22 },
  { label: 'Đầu sách & đánh giá', value: 15 },
]

export const PAYMENT_PREFERENCE: Bar[] = [
  { label: 'Chuyển khoản VietQR', value: 48 },
  { label: 'Ví điện tử', value: 26 },
  { label: 'Tiền mặt khi nhận (COD)', value: 19 },
  { label: 'Thẻ quốc tế', value: 7 },
]

export const SELLER_BARRIERS: Bar[] = [
  { label: 'Chụp ảnh, viết bài đăng bán', value: 52 },
  { label: 'Bị ép giá, người mua bùng hẹn', value: 28 },
  { label: 'Đóng gói, mang ra bưu cục', value: 20 },
]

export const SELLER_WANTS: Bar[] = [
  { label: 'Được lấy sách tận nhà', value: 92 },
  { label: 'Nhận tiền trong 24 giờ', value: 89 },
  { label: 'Quét ISBN báo giá trong 3 giây', value: 86 },
]

export interface Persona {
  name: string
  age: number
  role: string
  place: string
  archetype: string
  quote: string
  facts: [string, string][]
}

export const PERSONAS: Persona[] = [
  {
    name: 'Nguyễn Minh Anh',
    age: 22,
    role: 'Sinh viên, làm freelance',
    place: 'Cầu Giấy, Hà Nội',
    archetype: 'Người mua tiết kiệm',
    quote: 'Mình đọc 2–3 cuốn mỗi tháng, mua mới hết thì không kham nổi.',
    facts: [
      ['Kênh khám phá', 'TikTok Shop, nhóm Facebook'],
      ['Thanh toán', 'VietQR, MoMo'],
      ['Giá trị vòng đời', '2,4 triệu đồng/năm'],
    ],
  },
  {
    name: 'Trần Quốc Tuấn',
    age: 35,
    role: 'Quản lý kinh doanh',
    place: 'Bình Thạnh, TP. HCM',
    archetype: 'Người bán dọn kệ',
    quote: 'Nhà có hơn 60 cuốn đọc rồi, đăng bán từng cuốn thì mất cả buổi.',
    facts: [
      ['Mỗi lần bán', '15–20 cuốn'],
      ['Tái đầu tư', '50% tiền bán để mua sách mới'],
      ['Kỳ vọng', 'Nhận tiền trong 24 giờ'],
    ],
  },
  {
    name: 'Lê Hoàng Mai',
    age: 30,
    role: 'Giảng viên đại học',
    place: 'Hải Châu, Đà Nẵng',
    archetype: 'Người sưu tầm khó tính',
    quote: 'Sách đến tay mà móp gáy là tôi không mua lại lần hai.',
    facts: [
      ['Đóng gói', 'Thùng carton 3 lớp'],
      ['Giá trị đơn', '450.000đ trung bình'],
      ['Giá trị vòng đời', '3,6 triệu đồng/năm'],
    ],
  },
]

export const COMPETITOR_HEADERS = ['BookWise', 'Shopee / Lazada', 'Fahasa / Phương Nam', 'Hội nhóm Facebook']

export const COMPETITOR_MATRIX: { criterion: string; cells: string[] }[] = [
  {
    criterion: 'Chống sách lậu',
    cells: ['Kiểm định 7 bước, hoàn 200% nếu sách giả', 'Phụ thuộc người bán, khó kiểm soát', 'Sách chính hãng', 'Không có cam kết'],
  },
  {
    criterion: 'Thu mua sách cũ',
    cells: ['Quét ISBN báo giá 3 giây, lấy tận nhà, trả tiền 24 giờ', 'Không có', 'Không có', 'Tự đăng bài, tự thương lượng'],
  },
  {
    criterion: 'Tốc độ giao',
    cells: ['Hỏa tốc 2 giờ (AhaMove), toàn quốc 24–48 giờ (GHN)', '2–5 ngày', '2–4 ngày', 'Tự hẹn gặp'],
  },
  {
    criterion: 'Giá',
    cells: ['Tiết kiệm 40–60% với sách đã qua sử dụng', 'Cạnh tranh, nhiều hàng trôi nổi', 'Giá bìa, ít khuyến mãi sâu', 'Rẻ nhưng không đảm bảo'],
  },
  {
    criterion: 'Thanh toán & bảo vệ',
    cells: ['VietQR, ví điện tử, COD được kiểm hàng', 'Ví sàn, COD', 'Thẻ, COD', 'Chuyển khoản trước, rủi ro cao'],
  },
]

export const PAIN_TO_FEATURE = [
  { pain: 'Sợ mua phải sách lậu', stat: '62,8%', feature: 'Nhãn kiểm định + ảnh thật từng cuốn', impact: '+42% tỉ lệ thêm vào giỏ', link: '/sach' },
  { pain: 'Cần sách trong 2 giờ', stat: '64,2%', feature: 'Tuỳ chọn giao hỏa tốc ở bước thanh toán', impact: '+35% đơn nội thành', link: '/thanh-toan' },
  { pain: 'Ngại mặc cả khi bán sách cũ', stat: '80%', feature: 'Công cụ báo giá thu mua + lấy tận nhà', impact: '5.000+ cuốn thu mua mỗi tháng', link: '/#thu-mua' },
  { pain: 'Đơn COD bị bùng', stat: '19%', feature: 'Ưu tiên VietQR với mã QR có sẵn số tiền', impact: '−28% tỉ lệ huỷ đơn', link: '/thanh-toan' },
]

export const SLIDES = [
  {
    kicker: 'Vấn đề',
    title: 'Người đọc muốn sách thật, giá mềm, đến nhanh',
    points: ['62,8% từng mua phải sách lậu', '73,4% sẵn lòng mua sách cũ chất lượng', '64,2% muốn nhận sách trong 2–4 giờ'],
  },
  {
    kicker: 'Giải pháp',
    title: 'Sàn sách kiểm định với ba tình trạng rõ ràng',
    points: ['Chỉ bán sách cũ: Như mới 95% · Đã qua sử dụng 80%', 'Giao hỏa tốc 2 giờ tại Hà Nội và TP. HCM', 'Thanh toán VietQR, ví, thẻ, COD'],
  },
  {
    kicker: 'Vòng tuần hoàn',
    title: 'Thu mua sách cũ để nuôi nguồn hàng',
    points: ['Báo giá tức thì theo tình trạng', 'Lấy sách tận nhà, trả tiền trong 24 giờ', '16,5 cuốn “đóng băng” mỗi hộ là nguồn cung lớn'],
  },
  {
    kicker: 'Kết quả kỳ vọng',
    title: 'Chỉ số mục tiêu sau 6 tháng vận hành',
    points: ['+42% tỉ lệ thêm vào giỏ nhờ nhãn kiểm định', '−28% đơn huỷ khi ưu tiên VietQR', '5.000+ cuốn thu mua mỗi tháng'],
  },
]
