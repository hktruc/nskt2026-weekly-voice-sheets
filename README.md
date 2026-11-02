# NSKT 2026 Weekly Voice — phương án 2

Website tĩnh GitHub Pages tổng hợp câu trả lời `WEEK` từ các tab hạn nộp thứ Năm của Google Sheet do chủ lớp cung cấp.

## Nguyên tắc dữ liệu

- Chỉ xuất tên công khai, câu trả lời liên quan, tab/hàng nguồn, hạn nộp và thời điểm nộp.
- Không xuất email, số điện thoại hoặc toàn bộ bảng thô.
- Bảy nhóm cấp cao bám theo ý định câu hỏi; ý chung cần ít nhất hai nguồn độc lập.
- Ý riêng được giữ riêng, không biến thành đồng thuận giả.

## Làm mới thủ công

Xuất CSV của các tab thứ Năm vào thư mục gốc, rồi chạy `node scripts/build-data.js`. Tệp `data/weeks.json` là ảnh chụp công khai dùng cho GitHub Pages.
