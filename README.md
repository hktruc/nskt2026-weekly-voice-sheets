# NSKT 2026 Weekly Voice — phương án 2

Website tĩnh GitHub Pages tổng hợp câu trả lời `WEEK` từ các tab hạn nộp thứ Năm của Google Sheet do chủ lớp cung cấp.

## Nguyên tắc dữ liệu

- Chỉ xuất tên công khai, câu trả lời liên quan, tab/hàng nguồn, hạn nộp và thời điểm nộp.
- Không xuất email, số điện thoại hoặc toàn bộ bảng thô.
- Bảy nhóm cấp cao bám theo ý định câu hỏi; bộ định tuyến đọc từng nhãn `Câu N:` trong nội dung đề rồi ánh xạ theo nghĩa của chính câu hỏi, không theo vị trí cột. Ý chung cần ít nhất hai nguồn độc lập. Bản hiện tại dùng quy tắc từ khóa có thể kiểm tra, không dùng mô hình AI.
- Ý riêng được giữ riêng, không biến thành đồng thuận giả.
- Câu hỏi mới, mơ hồ hoặc trùng ý định được giữ trong `reviewQueue`, không bị gán sai hay bỏ im lặng.
- Mỗi nguồn có dấu vân tay nội dung SHA-256 rút gọn; số hàng chỉ dùng để đối chiếu tại thời điểm tạo ảnh chụp.

## Làm mới thủ công

Xuất CSV của các tab thứ Năm vào thư mục gốc, rồi chạy `node scripts/build-data.js`. Tệp `data/weeks.json` là ảnh chụp công khai dùng cho GitHub Pages. Chưa có lịch làm mới tự động; đây là quy trình thủ công.
