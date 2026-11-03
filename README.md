# NSKT 2026 Weekly Voice — phương án 2

GitHub Pages trình bày bản tin góp ý từ các hàng `Loại bài = WEEK` trong những tab hạn nộp thứ Năm của Google Sheet do chủ lớp cung cấp.

## Cấu trúc bản tin

`Câu hỏi: [chủ đề BTC] → 5–10 ý chính có bằng chứng → danh sách học viên → câu hỏi và câu trả lời nguyên văn`.

Không đánh số câu hỏi ở tiêu đề vì BTC có thể đổi vị trí. Cột `Nội dung câu hỏi` của từng tab là nguồn xác định ý nghĩa; mã `Câu N` chỉ dùng để ghép đúng ô trả lời trong chính hàng đó.

Chỉ công bố tên, phản hồi liên quan và dấu vết tab/hàng/thời gian. Không công bố email, số điện thoại hoặc bảng thô. Ý hiếm cần hỗ trợ và quan điểm trái chiều được giữ lại; không biến thành đồng thuận giả.

Nguồn công khai không có mã học viên ổn định. Số người được tính theo tên đã chuẩn hóa; các tên trùng được gộp bảo thủ và giao diện ghi rõ đây là số **tên học viên**, không suy diễn danh tính từ thông tin liên hệ.

## Cập nhật theo giờ

Phương án 2 **không gọi Cloudflare Workers AI**. GitHub Actions chỉ kiểm tra bản tin đã xuất bản và không tiêu quota AI.

Tác vụ ChatGPT theo giờ sẽ:

1. Đọc các tab thứ Năm và lọc hàng `WEEK`.
2. So sánh content hash; không đổi thì không commit.
3. Khi có dữ liệu mới/sửa, phân loại theo nghĩa câu hỏi, tổng hợp có dẫn nguồn và cập nhật `data/weeks.json`.
4. Chạy `node scripts/validate-snapshot.mjs` trước khi commit. Bản đang dở không được ghi đè bản đã kiểm chứng.

Các secrets Cloudflare cũ không còn được workflow sử dụng. Việc xóa secrets là thao tác quản trị riêng, không tự động thực hiện.
