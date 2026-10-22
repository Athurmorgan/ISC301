import type { Book, CategoryId } from '../models/types'

// Danh mục sách khởi tạo. Ảnh bìa là bìa ấn bản gốc/quốc tế lấy từ Open Library
// (covers.openlibrary.org), lưu sẵn trong public/covers để chạy offline.
// Năm = năm xuất bản lần đầu của nguyên tác; số trang tham khảo theo ấn bản gốc.

type Seed = Omit<Book, 'cover' | 'category'>

const shelf = (category: CategoryId, books: Seed[]): Book[] =>
  books.map((b) => ({ ...b, category, cover: `/covers/${b.id}.jpg` }))

const economics = shelf('kinh-te', [
  {
    id: 'tam-ly-hoc-ve-tien', title: 'Tâm lý học về tiền', originalTitle: 'The Psychology of Money', originalLanguage: 'tiếng Anh',
    author: 'Morgan Housel', price: 145_000, listPrice: 189_000, dealPrice: 119_000, stock: 42, sold: 2140, rating: 4.8, ratingCount: 1260,
    pages: 256, firstPublished: 2020,
    description: '19 câu chuyện ngắn cho thấy cách ta cư xử với tiền quan trọng hơn những gì ta biết về tài chính. Housel viết về lòng tham, nỗi sợ, may rủi và sức mạnh âm thầm của lãi kép bằng giọng văn rất dễ đọc.',
    staffPick: 'Cuốn chúng tôi hay tặng cho người vừa nhận lương tháng đầu tiên.',
  },
  {
    id: 'cha-giau-cha-ngheo', title: 'Cha giàu, cha nghèo', originalTitle: 'Rich Dad Poor Dad', originalLanguage: 'tiếng Anh',
    author: 'Robert T. Kiyosaki', publisher: 'NXB Trẻ', price: 98_000, listPrice: 125_000, stock: 37, sold: 3810, rating: 4.5, ratingCount: 2050,
    pages: 207, firstPublished: 1997,
    description: 'Hai người cha với hai quan niệm trái ngược về tiền bạc, và bài học về tài sản, tiêu sản mà trường học không dạy. Một cuốn nhập môn tư duy tài chính cá nhân đã bán hàng chục triệu bản.',
  },
  {
    id: 'nha-dau-tu-thong-minh', title: 'Nhà đầu tư thông minh', originalTitle: 'The Intelligent Investor', originalLanguage: 'tiếng Anh',
    author: 'Benjamin Graham', price: 219_000, listPrice: 279_000, stock: 14, sold: 960, rating: 4.7, ratingCount: 410,
    pages: 640, firstPublished: 1949,
    description: 'Nền tảng của trường phái đầu tư giá trị: biên an toàn, ông Thị Trường và sự khác biệt giữa đầu tư với đầu cơ. Warren Buffett gọi đây là cuốn sách hay nhất về đầu tư từng được viết.',
  },
  {
    id: 'tu-tot-den-vi-dai', title: 'Từ tốt đến vĩ đại', originalTitle: 'Good to Great', originalLanguage: 'tiếng Anh',
    author: 'Jim Collins', price: 135_000, listPrice: 168_000, stock: 21, sold: 1120, rating: 4.6, ratingCount: 520,
    pages: 300, firstPublished: 2001,
    description: 'Nhóm nghiên cứu của Jim Collins theo dõi 1.435 công ty để tìm ra vì sao chỉ 11 cái tên vượt từ “tốt” lên “vĩ đại” và giữ được phong độ suốt 15 năm.',
  },
  {
    id: 'khoi-nghiep-tinh-gon', title: 'Khởi nghiệp tinh gọn', originalTitle: 'The Lean Startup', originalLanguage: 'tiếng Anh',
    author: 'Eric Ries', price: 129_000, listPrice: 159_000, stock: 16, sold: 690, rating: 4.5, ratingCount: 300,
    pages: 336, firstPublished: 2011,
    description: 'Xây — đo — học: phương pháp thử nghiệm nhanh với sản phẩm khả dụng tối thiểu để biết khách hàng thật sự cần gì trước khi đốt hết vốn.',
  },
  {
    id: 'khong-den-mot', title: 'Không đến một', originalTitle: 'Zero to One', originalLanguage: 'tiếng Anh',
    author: 'Peter Thiel, Blake Masters', price: 109_000, listPrice: 138_000, stock: 19, sold: 840, rating: 4.4, ratingCount: 360,
    pages: 224, firstPublished: 2014,
    description: 'Đồng sáng lập PayPal cho rằng tiến bộ thật sự đến từ việc tạo ra thứ hoàn toàn mới, không phải sao chép thứ đã có. Những ghi chép từ khóa học khởi nghiệp nổi tiếng ở Stanford.',
  },
  {
    id: 'tu-duy-nhanh-va-cham', title: 'Tư duy nhanh và chậm', originalTitle: 'Thinking, Fast and Slow', originalLanguage: 'tiếng Anh',
    author: 'Daniel Kahneman', price: 199_000, listPrice: 259_000, dealPrice: 159_000, stock: 23, sold: 1530, rating: 4.7, ratingCount: 780,
    pages: 499, firstPublished: 2011,
    description: 'Nhà kinh tế học đoạt giải Nobel giải thích hai hệ thống điều khiển suy nghĩ: một nhanh, trực giác; một chậm, cân nhắc — và những thiên kiến khiến ta quyết định sai.',
    staffPick: 'Đọc chậm, mỗi tối một chương. Bạn sẽ nhận ra chính mình trong rất nhiều thí nghiệm.',
  },
  {
    id: 'kinh-te-hoc-hai-huoc', title: 'Kinh tế học hài hước', originalTitle: 'Freakonomics', originalLanguage: 'tiếng Anh',
    author: 'Steven D. Levitt, Stephen J. Dubner', price: 112_000, listPrice: 140_000, stock: 18, sold: 620, rating: 4.4, ratingCount: 270,
    pages: 320, firstPublished: 2005,
    description: 'Giáo viên gian lận, đô vật sumo dàn xếp và vì sao băng buôn ma túy vẫn sống chung với mẹ: kinh tế học được dùng để soi những câu hỏi đời thường kỳ lạ nhất.',
  },
  {
    id: 'chien-luoc-dai-duong-xanh', title: 'Chiến lược đại dương xanh', originalTitle: 'Blue Ocean Strategy', originalLanguage: 'tiếng Anh',
    author: 'W. Chan Kim, Renée Mauborgne', price: 159_000, listPrice: 199_000, stock: 11, sold: 540, rating: 4.5, ratingCount: 230,
    pages: 298, firstPublished: 2005,
    description: 'Thay vì lao vào “đại dương đỏ” cạnh tranh khốc liệt, doanh nghiệp có thể tạo ra khoảng thị trường chưa ai khai phá. Kèm các công cụ phân tích như đường giá trị và khung bốn hành động.',
  },
  {
    id: 'nguoi-giau-co-nhat-babylon', title: 'Người giàu có nhất thành Babylon', originalTitle: 'The Richest Man in Babylon', originalLanguage: 'tiếng Anh',
    author: 'George S. Clason', price: 69_000, listPrice: 88_000, stock: 33, sold: 2210, rating: 4.6, ratingCount: 980,
    pages: 144, firstPublished: 1926,
    description: 'Những ngụ ngôn về tiết kiệm, đầu tư và trả nợ đặt trong bối cảnh Babylon cổ đại. Mỏng, dễ đọc và vẫn đúng sau gần một trăm năm.',
  },
  {
    id: 'nghi-giau-lam-giau', title: 'Nghĩ giàu & làm giàu', originalTitle: 'Think and Grow Rich', originalLanguage: 'tiếng Anh',
    author: 'Napoleon Hill', price: 96_000, listPrice: 120_000, stock: 26, sold: 1680, rating: 4.4, ratingCount: 750,
    pages: 238, firstPublished: 1937,
    description: 'Mười ba nguyên tắc thành công được Napoleon Hill đúc kết sau hơn hai mươi năm phỏng vấn những doanh nhân thành đạt nhất nước Mỹ đầu thế kỷ XX.',
  },
  {
    id: 'ga-nghien-giay', title: 'Gã nghiện giày', originalTitle: 'Shoe Dog', originalLanguage: 'tiếng Anh',
    author: 'Phil Knight', price: 165_000, listPrice: 209_000, stock: 15, sold: 870, rating: 4.8, ratingCount: 390,
    pages: 386, firstPublished: 2016,
    description: 'Hồi ký của người sáng lập Nike, từ khoản vay 50 đô của cha đến một thương hiệu toàn cầu. Thẳng thắn về những lần suýt phá sản và những người đã cùng ông đi qua.',
    staffPick: 'Hồi ký doanh nhân hay nhất mà hiệu sách từng bán. Đọc như tiểu thuyết.',
  },
])

const selfHelp = shelf('ky-nang', [
  {
    id: 'dac-nhan-tam', title: 'Đắc nhân tâm', originalTitle: 'How to Win Friends and Influence People', originalLanguage: 'tiếng Anh',
    author: 'Dale Carnegie', publisher: 'First News', price: 76_000, listPrice: 96_000, stock: 54, sold: 6120, rating: 4.7, ratingCount: 4020,
    pages: 291, firstPublished: 1936,
    description: 'Những nguyên tắc giao tiếp căn bản: lắng nghe, khen ngợi chân thành, tránh tranh cãi. Gần một thế kỷ sau, cuốn sách vẫn được đọc như một cẩm nang ứng xử.',
  },
  {
    id: 'thoi-quen-nguyen-tu', title: 'Thói quen nguyên tử', originalTitle: 'Atomic Habits', originalLanguage: 'tiếng Anh',
    author: 'James Clear', price: 159_000, listPrice: 199_000, dealPrice: 125_000, stock: 35, sold: 3420, rating: 4.8, ratingCount: 2210,
    pages: 320, firstPublished: 2018,
    description: 'Thay đổi 1% mỗi ngày, cộng dồn thành khác biệt lớn. James Clear đưa ra bốn quy luật để hình thành thói quen tốt và bỏ thói quen xấu, kèm nhiều ví dụ dễ áp dụng.',
  },
  {
    id: '7-thoi-quen-hieu-qua', title: '7 thói quen hiệu quả', originalTitle: 'The 7 Habits of Highly Effective People', originalLanguage: 'tiếng Anh',
    author: 'Stephen R. Covey', price: 179_000, listPrice: 229_000, stock: 20, sold: 1390, rating: 4.6, ratingCount: 640,
    pages: 381, firstPublished: 1989,
    description: 'Đi từ chiến thắng bản thân đến chiến thắng tập thể: chủ động, bắt đầu với mục tiêu, ưu tiên điều quan trọng, tư duy cùng thắng và những thói quen còn lại.',
  },
  {
    id: 'suc-manh-cua-thoi-quen', title: 'Sức mạnh của thói quen', originalTitle: 'The Power of Habit', originalLanguage: 'tiếng Anh',
    author: 'Charles Duhigg', price: 139_000, listPrice: 175_000, stock: 17, sold: 760, rating: 4.5, ratingCount: 310,
    pages: 371, firstPublished: 2012,
    description: 'Vòng lặp tín hiệu — hành động — phần thưởng giải thích vì sao ta làm điều ta làm, từ cá nhân đến các tập đoàn như Alcoa hay Starbucks.',
  },
  {
    id: 'lam-ra-lam-choi-ra-choi', title: 'Làm ra làm, chơi ra chơi', originalTitle: 'Deep Work', originalLanguage: 'tiếng Anh',
    author: 'Cal Newport', price: 125_000, listPrice: 159_000, stock: 22, sold: 980, rating: 4.6, ratingCount: 420,
    pages: 296, firstPublished: 2016,
    description: 'Khả năng tập trung sâu đang trở nên hiếm và vì thế ngày càng có giá. Newport đề xuất những quy tắc cụ thể để làm việc không bị xao nhãng trong thời đại mạng xã hội.',
  },
  {
    id: 'tam-ly-hoc-thanh-cong', title: 'Tâm lý học thành công', originalTitle: 'Mindset', originalLanguage: 'tiếng Anh',
    author: 'Carol S. Dweck', price: 119_000, listPrice: 149_000, stock: 24, sold: 1050, rating: 4.6, ratingCount: 470,
    pages: 288, firstPublished: 2006,
    description: 'Tư duy cố định hay tư duy phát triển? Nghiên cứu của nhà tâm lý học Stanford cho thấy niềm tin về năng lực ảnh hưởng thế nào đến việc học, công việc và các mối quan hệ.',
  },
  {
    id: 'grit', title: 'Grit — Sức mạnh của đam mê và kiên trì', originalTitle: 'Grit', originalLanguage: 'tiếng Anh',
    author: 'Angela Duckworth', price: 135_000, listPrice: 169_000, stock: 13, sold: 520, rating: 4.4, ratingCount: 210,
    pages: 333, firstPublished: 2016,
    description: 'Tài năng không phải tất cả. Angela Duckworth chỉ ra rằng sự bền bỉ theo đuổi một mục tiêu dài hạn mới là yếu tố dự báo thành công đáng tin cậy.',
  },
  {
    id: 'huong-noi', title: 'Quiet — Sức mạnh của người hướng nội', originalTitle: 'Quiet', originalLanguage: 'tiếng Anh',
    author: 'Susan Cain', price: 149_000, listPrice: 189_000, stock: 12, sold: 610, rating: 4.7, ratingCount: 290,
    pages: 333, firstPublished: 2012,
    description: 'Trong một thế giới đề cao sự hoạt ngôn, Susan Cain bênh vực những người trầm lặng và cho thấy cách họ đóng góp theo kiểu của riêng mình.',
  },
  {
    id: 'di-tim-le-song', title: 'Đi tìm lẽ sống', originalTitle: "Man's Search for Meaning", originalLanguage: 'tiếng Đức',
    author: 'Viktor E. Frankl', publisher: 'First News', price: 72_000, listPrice: 88_000, stock: 40, sold: 2760, rating: 4.9, ratingCount: 1530,
    pages: 165, firstPublished: 1946,
    description: 'Bác sĩ tâm thần Viktor Frankl kể lại những năm trong trại tập trung và rút ra một điều: con người có thể chịu đựng gần như mọi thứ nếu tìm thấy ý nghĩa cho nỗi đau của mình.',
    staffPick: 'Mỏng, nhưng là cuốn sách nhiều người quay lại đọc nhất.',
  },
  {
    id: 'ikigai', title: 'Ikigai — Bí mật sống trường thọ và hạnh phúc của người Nhật', originalTitle: 'Ikigai', originalLanguage: 'tiếng Tây Ban Nha',
    author: 'Héctor García, Francesc Miralles', price: 89_000, listPrice: 112_000, stock: 30, sold: 1640, rating: 4.4, ratingCount: 690,
    pages: 208, firstPublished: 2016,
    description: 'Hai tác giả đến ngôi làng Ogimi ở Okinawa để tìm hiểu vì sao người dân ở đây sống thọ, và khái niệm “lý do để thức dậy mỗi sáng”.',
  },
  {
    id: 'nghe-thuat-tinh-te', title: 'Nghệ thuật tinh tế của việc đếch quan tâm', originalTitle: 'The Subtle Art of Not Giving a F*ck', originalLanguage: 'tiếng Anh',
    author: 'Mark Manson', price: 99_000, listPrice: 125_000, stock: 28, sold: 1910, rating: 4.3, ratingCount: 870,
    pages: 224, firstPublished: 2016,
    description: 'Không phải sách “nghĩ tích cực”. Manson khuyên bạn chọn thật kỹ những điều đáng bận tâm và chấp nhận rằng đau khổ là một phần của cuộc sống.',
  },
  {
    id: 'dam-bi-ghet', title: 'Dám bị ghét', originalTitle: '嫌われる勇気 (The Courage to Be Disliked)', originalLanguage: 'tiếng Nhật',
    author: 'Kishimi Ichiro, Koga Fumitake', price: 105_000, listPrice: 129_000, stock: 25, sold: 1460, rating: 4.6, ratingCount: 640,
    pages: 280, firstPublished: 2013,
    description: 'Cuộc đối thoại giữa một triết gia và một chàng trai trẻ về tâm lý học Adler: tự do là chấp nhận rằng không phải ai cũng sẽ quý mình.',
  },
])

const literature = shelf('van-hoc', [
  {
    id: 'nha-gia-kim', title: 'Nhà giả kim', originalTitle: 'O Alquimista', originalLanguage: 'tiếng Bồ Đào Nha',
    author: 'Paulo Coelho', publisher: 'Nhã Nam', price: 69_000, listPrice: 79_000, stock: 62, sold: 5230, rating: 4.7, ratingCount: 3120,
    pages: 228, firstPublished: 1988,
    description: 'Chàng chăn cừu Santiago rời Andalusia đến sa mạc Ai Cập theo một giấc mơ về kho báu. Một câu chuyện ngụ ngôn ngắn về việc lắng nghe trái tim và đi đến cùng con đường của mình.',
  },
  {
    id: 'rung-na-uy', title: 'Rừng Na Uy', originalTitle: 'ノルウェイの森 (Norwegian Wood)', originalLanguage: 'tiếng Nhật',
    author: 'Haruki Murakami', publisher: 'Nhã Nam', price: 125_000, listPrice: 155_000, stock: 19, sold: 1980, rating: 4.6, ratingCount: 1020,
    pages: 389, firstPublished: 1987,
    description: 'Tokyo cuối những năm 1960. Watanabe nhớ lại mối tình với Naoko — cô gái mang vết thương từ cái chết của người bạn chung — và Midori, sống động, ồn ào và đầy sức sống.',
  },
  {
    id: 'kafka-ben-bo-bien', title: 'Kafka bên bờ biển', originalTitle: '海辺のカフカ (Kafka on the Shore)', originalLanguage: 'tiếng Nhật',
    author: 'Haruki Murakami', publisher: 'Nhã Nam', price: 165_000, listPrice: 205_000, stock: 0, sold: 840, rating: 4.7, ratingCount: 420,
    pages: 505, firstPublished: 2002,
    description: 'Cậu thiếu niên mười lăm tuổi bỏ nhà ra đi và ông lão Nakata biết nói chuyện với mèo — hai câu chuyện song song dần đan vào nhau trong thế giới nửa thực nửa mơ của Murakami.',
  },
  {
    id: '1984', title: '1984', originalTitle: 'Nineteen Eighty-Four', originalLanguage: 'tiếng Anh',
    author: 'George Orwell', publisher: 'Nhã Nam', price: 105_000, listPrice: 130_000, stock: 27, sold: 2010, rating: 4.7, ratingCount: 1130,
    pages: 328, firstPublished: 1949,
    description: 'Winston Smith làm việc tại Bộ Sự thật, nơi quá khứ được viết lại mỗi ngày. Cuốn tiểu thuyết đã đặt ra những khái niệm như Anh Cả, tư duy kép và cảnh sát tư tưởng.',
  },
  {
    id: 'trai-suc-vat', title: 'Trại súc vật', originalTitle: 'Animal Farm', originalLanguage: 'tiếng Anh',
    author: 'George Orwell', publisher: 'Nhã Nam', price: 59_000, listPrice: 72_000, stock: 31, sold: 1570, rating: 4.6, ratingCount: 740,
    pages: 112, firstPublished: 1945,
    description: 'Các con vật nổi dậy đuổi ông chủ trại và lập nên một xã hội bình đẳng — cho đến khi “có những con vật bình đẳng hơn những con khác”.',
  },
  {
    id: 'bo-gia', title: 'Bố già', originalTitle: 'The Godfather', originalLanguage: 'tiếng Anh',
    author: 'Mario Puzo', price: 149_000, listPrice: 185_000, dealPrice: 115_000, stock: 18, sold: 1780, rating: 4.8, ratingCount: 960,
    pages: 448, firstPublished: 1969,
    description: 'Gia đình Corleone và luật lệ riêng của họ giữa thế giới ngầm New York. Nền tảng cho bộ phim kinh điển của Francis Ford Coppola.',
  },
  {
    id: 'hoang-tu-be', title: 'Hoàng tử bé', originalTitle: 'Le Petit Prince', originalLanguage: 'tiếng Pháp',
    author: 'Antoine de Saint-Exupéry', publisher: 'Nhã Nam', price: 58_000, listPrice: 70_000, stock: 45, sold: 3640, rating: 4.8, ratingCount: 2050,
    pages: 96, firstPublished: 1943,
    description: 'Một phi công rơi máy bay giữa sa mạc gặp cậu bé đến từ tiểu hành tinh B612. Câu chuyện viết cho trẻ em nhưng người lớn đọc lại mới thấy hết.',
    staffPick: 'Món quà an toàn nhất cho bất kỳ ai, ở bất kỳ tuổi nào.',
  },
  {
    id: 'giet-con-chim-nhai', title: 'Giết con chim nhại', originalTitle: 'To Kill a Mockingbird', originalLanguage: 'tiếng Anh',
    author: 'Harper Lee', publisher: 'Nhã Nam', price: 115_000, listPrice: 140_000, stock: 16, sold: 1120, rating: 4.8, ratingCount: 610,
    pages: 324, firstPublished: 1960,
    description: 'Qua đôi mắt cô bé Scout, một vụ án ở thị trấn nhỏ miền Nam nước Mỹ những năm 1930 phơi bày định kiến chủng tộc và lòng can đảm của người cha Atticus Finch.',
  },
  {
    id: 'dai-gia-gatsby', title: 'Gatsby vĩ đại', originalTitle: 'The Great Gatsby', originalLanguage: 'tiếng Anh',
    author: 'F. Scott Fitzgerald', price: 79_000, listPrice: 98_000, stock: 22, sold: 980, rating: 4.4, ratingCount: 450,
    pages: 180, firstPublished: 1925,
    description: 'Những bữa tiệc xa hoa ở Long Island và một người đàn ông dồn cả gia tài để níu lại quá khứ. Bức chân dung sắc nét về Giấc mơ Mỹ thời Jazz.',
  },
  {
    id: 'tram-nam-co-don', title: 'Trăm năm cô đơn', originalTitle: 'Cien años de soledad', originalLanguage: 'tiếng Tây Ban Nha',
    author: 'Gabriel García Márquez', publisher: 'Nhã Nam', price: 155_000, listPrice: 195_000, stock: 14, sold: 1310, rating: 4.7, ratingCount: 680,
    pages: 417, firstPublished: 1967,
    description: 'Bảy thế hệ nhà Buendía ở làng Macondo, nơi những điều kỳ ảo xảy ra bình thản như chuyện thường ngày. Kiệt tác của chủ nghĩa hiện thực huyền ảo.',
  },
  {
    id: 'nguoi-dua-dieu', title: 'Người đua diều', originalTitle: 'The Kite Runner', originalLanguage: 'tiếng Anh',
    author: 'Khaled Hosseini', publisher: 'Nhã Nam', price: 125_000, listPrice: 155_000, stock: 20, sold: 1450, rating: 4.8, ratingCount: 790,
    pages: 371, firstPublished: 2003,
    description: 'Amir và Hassan lớn lên cùng nhau ở Kabul cho đến một buổi chiều thả diều làm thay đổi tất cả. Câu chuyện về tình bạn, sự phản bội và con đường chuộc lỗi.',
  },
  {
    id: 'ong-gia-va-bien-ca', title: 'Ông già và biển cả', originalTitle: 'The Old Man and the Sea', originalLanguage: 'tiếng Anh',
    author: 'Ernest Hemingway', price: 55_000, listPrice: 68_000, stock: 29, sold: 1260, rating: 4.5, ratingCount: 560,
    pages: 127, firstPublished: 1952,
    description: 'Ông lão Santiago ra khơi sau 84 ngày không bắt được cá và vật lộn ba ngày đêm với một con cá kiếm khổng lồ. Tác phẩm góp phần đưa Hemingway đến giải Nobel.',
  },
  {
    id: 'harry-potter-1', title: 'Harry Potter và Hòn đá Phù thủy', originalTitle: "Harry Potter and the Philosopher's Stone", originalLanguage: 'tiếng Anh',
    author: 'J. K. Rowling', publisher: 'NXB Trẻ', price: 135_000, listPrice: 165_000, dealPrice: 109_000, stock: 33, sold: 2890, rating: 4.9, ratingCount: 1870,
    pages: 223, firstPublished: 1997,
    description: 'Vào sinh nhật mười một tuổi, Harry nhận được thư nhập học từ Trường Phù thủy và Pháp sư Hogwarts. Mở đầu cho bộ truyện của cả một thế hệ độc giả.',
  },
  {
    id: 'khong-gia-dinh', title: 'Không gia đình', originalTitle: 'Sans famille', originalLanguage: 'tiếng Pháp',
    author: 'Hector Malot', price: 119_000, listPrice: 148_000, stock: 17, sold: 940, rating: 4.7, ratingCount: 430,
    pages: 520, firstPublished: 1878,
    description: 'Cậu bé Rémi bị bán cho một gánh xiếc rong và bắt đầu cuộc hành trình khắp nước Pháp cùng cụ Vitalis và đàn chó, chú khỉ Joli-Coeur.',
  },
  {
    id: 'nhung-nguoi-khon-kho', title: 'Những người khốn khổ', originalTitle: 'Les Misérables', originalLanguage: 'tiếng Pháp',
    author: 'Victor Hugo', price: 289_000, listPrice: 360_000, stock: 9, sold: 410, rating: 4.9, ratingCount: 260,
    pages: 1463, firstPublished: 1862,
    description: 'Jean Valjean, người tù khổ sai được cứu rỗi bởi lòng tốt của một giám mục, và cuộc truy đuổi kéo dài nhiều năm của thanh tra Javert. Bộ tiểu thuyết đồ sộ về công lý và lòng nhân.',
  },
])

const science = shelf('khoa-hoc', [
  {
    id: 'sapiens', title: 'Sapiens: Lược sử loài người', originalTitle: 'Sapiens: A Brief History of Humankind', originalLanguage: 'tiếng Hebrew',
    author: 'Yuval Noah Harari', price: 209_000, listPrice: 269_000, dealPrice: 169_000, stock: 18, sold: 1920, rating: 4.8, ratingCount: 980,
    pages: 443, firstPublished: 2011,
    description: 'Hành trình 70.000 năm từ một loài vượn không mấy nổi bật đến chủ nhân hành tinh: cách mạng nhận thức, nông nghiệp, sự thống nhất loài người và cách mạng khoa học.',
  },
  {
    id: 'homo-deus', title: 'Homo Deus: Lược sử tương lai', originalTitle: 'Homo Deus: A Brief History of Tomorrow', originalLanguage: 'tiếng Hebrew',
    author: 'Yuval Noah Harari', price: 199_000, listPrice: 255_000, stock: 13, sold: 870, rating: 4.6, ratingCount: 390,
    pages: 448, firstPublished: 2015,
    description: 'Khi nạn đói, dịch bệnh và chiến tranh dần bị kiểm soát, loài người sẽ theo đuổi điều gì tiếp theo? Harari bàn về dữ liệu, thuật toán và tương lai của chủ nghĩa nhân văn.',
  },
  {
    id: '21-bai-hoc', title: '21 bài học cho thế kỷ 21', originalTitle: '21 Lessons for the 21st Century', originalLanguage: 'tiếng Anh',
    author: 'Yuval Noah Harari', price: 189_000, listPrice: 239_000, stock: 15, sold: 650, rating: 4.5, ratingCount: 280,
    pages: 372, firstPublished: 2018,
    description: 'Sau quá khứ và tương lai, Harari quay về hiện tại: tin giả, chủ nghĩa dân tộc, việc làm trong thời AI và cách giữ sự tỉnh táo giữa quá nhiều thông tin.',
  },
  {
    id: 'sung-vi-trung-va-thep', title: 'Súng, vi trùng và thép', originalTitle: 'Guns, Germs, and Steel', originalLanguage: 'tiếng Anh',
    author: 'Jared Diamond', price: 229_000, listPrice: 289_000, stock: 10, sold: 480, rating: 4.6, ratingCount: 210,
    pages: 480, firstPublished: 1997,
    description: 'Vì sao các xã hội Á-Âu chinh phục thế giới mà không phải ngược lại? Câu trả lời của Jared Diamond nằm ở địa lý, cây trồng, vật nuôi và mầm bệnh. Giải Pulitzer 1998.',
  },
  {
    id: 'luoc-su-thoi-gian', title: 'Lược sử thời gian', originalTitle: 'A Brief History of Time', originalLanguage: 'tiếng Anh',
    author: 'Stephen Hawking', publisher: 'NXB Trẻ', price: 115_000, listPrice: 145_000, stock: 12, sold: 720, rating: 4.6, ratingCount: 380,
    pages: 212, firstPublished: 1988,
    description: 'Từ Vụ Nổ Lớn đến lỗ đen và mũi tên thời gian, Stephen Hawking giải thích những câu hỏi lớn của vũ trụ học mà gần như không dùng đến một phương trình nào.',
  },
  {
    id: 'vu-tru', title: 'Vũ trụ', originalTitle: 'Cosmos', originalLanguage: 'tiếng Anh',
    author: 'Carl Sagan', price: 175_000, listPrice: 219_000, stock: 11, sold: 560, rating: 4.8, ratingCount: 250,
    pages: 365, firstPublished: 1980,
    description: 'Cuốn sách đi kèm loạt phim tài liệu nổi tiếng: lịch sử khoa học, sự tiến hoá của sự sống và vị trí nhỏ bé nhưng quý giá của Trái Đất giữa vũ trụ bao la.',
    staffPick: 'Nếu chỉ đọc một cuốn khoa học phổ thông trong năm nay, hãy chọn cuốn này.',
  },
  {
    id: 'gen-ich-ky', title: 'Gen vị kỷ', originalTitle: 'The Selfish Gene', originalLanguage: 'tiếng Anh',
    author: 'Richard Dawkins', price: 159_000, listPrice: 199_000, stock: 9, sold: 430, rating: 4.5, ratingCount: 190,
    pages: 360, firstPublished: 1976,
    description: 'Nhìn tiến hoá từ góc độ của gen thay vì cá thể. Cuốn sách cũng là nơi lần đầu xuất hiện khái niệm “meme”.',
  },
  {
    id: 'su-that-ve-the-gioi', title: 'Factfulness — Sự thật về thế giới', originalTitle: 'Factfulness', originalLanguage: 'tiếng Anh',
    author: 'Hans Rosling', price: 155_000, listPrice: 195_000, stock: 16, sold: 590, rating: 4.7, ratingCount: 260,
    pages: 342, firstPublished: 2018,
    description: 'Mười bản năng khiến ta nhìn thế giới bi quan hơn thực tế, và cách dùng dữ liệu để suy nghĩ rõ ràng hơn. Cuốn sách cuối cùng của bác sĩ Hans Rosling.',
  },
  {
    id: 'nguon-goc-cac-loai', title: 'Nguồn gốc các loài', originalTitle: 'On the Origin of Species', originalLanguage: 'tiếng Anh',
    author: 'Charles Darwin', price: 185_000, listPrice: 230_000, stock: 7, sold: 260, rating: 4.6, ratingCount: 110,
    pages: 502, firstPublished: 1859,
    description: 'Tác phẩm đặt nền móng cho sinh học tiến hoá, trình bày thuyết chọn lọc tự nhiên qua những quan sát tỉ mỉ suốt hơn hai mươi năm.',
  },
  {
    id: 'gen-lich-su', title: 'Gen: Lịch sử và tương lai của nhân loại', originalTitle: 'The Gene: An Intimate History', originalLanguage: 'tiếng Anh',
    author: 'Siddhartha Mukherjee', price: 245_000, listPrice: 309_000, stock: 8, sold: 310, rating: 4.7, ratingCount: 140,
    pages: 592, firstPublished: 2016,
    description: 'Từ vườn đậu của Mendel đến công nghệ chỉnh sửa gen CRISPR, xen lẫn câu chuyện về bệnh tâm thần trong chính gia đình tác giả.',
  },
])

export const SEED_BOOKS: Book[] = [...economics, ...selfHelp, ...literature, ...science]
