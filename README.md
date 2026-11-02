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

## Làm mới AI theo lịch (chuẩn bị, chưa kích hoạt)

Workflow `.github/workflows/refresh.yml` chạy phút 17 mỗi ba giờ để tránh đỉnh tải đầu giờ. Nó dò các tab thứ Năm, loại dữ liệu liên hệ, gửi `sourceId + câu hỏi + câu trả lời` đã ẩn danh tới Workers AI, kiểm tra lại mọi `sourceId`, rồi mới ghi snapshot.

Cần hai GitHub Actions secrets: `CLOUDFLARE_ACCOUNT_ID` và `CLOUDFLARE_API_TOKEN`. Token riêng chỉ giới hạn trong đúng tài khoản và quyền `Workers AI Read` + `Workers AI Edit`, theo tài liệu REST chính thức của Cloudflare. Không nhập token vào mã nguồn hoặc nội dung chat.

Khi quota/API lỗi, snapshot thành công trước đó được giữ nguyên, `data/status.json` ghi lần thử thất bại, và workflow kết thúc ở trạng thái failed; trang không được đóng dấu thời gian mới giả tạo. Phần này chưa được chạy vì chưa có secrets được phê duyệt.
