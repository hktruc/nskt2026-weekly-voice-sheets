import fs from 'node:fs';
import crypto from 'node:crypto';

const freshPath = process.env.FRESH_SNAPSHOT;
if (!freshPath) throw new Error('FRESH_SNAPSHOT is required');
const checkedAt = process.env.CHECKED_AT || new Date().toISOString();
const dataPath = 'data/weeks.json';
const current = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const fresh = JSON.parse(fs.readFileSync(freshPath, 'utf8'));
const tab = '20261105';
const previousWeek = current.weeks.find((week) => week.tab === tab);
const freshWeek = fresh.weeks.find((week) => week.tab === tab);
if (!previousWeek || !freshWeek) throw new Error(`${tab} missing`);

const stableHash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const protectedBefore = stableHash(current.weeks.filter((week) => ['20261022', '20261029'].includes(week.tab)));
const sourceMap = new Map(freshWeek.sources.map((source) => [source.id, source]));
const idea = (title, summary, sourceIds, extra = {}) => ({
  title,
  summary,
  sourceIds,
  count: new Set(sourceIds.map((id) => sourceMap.get(id)?.name?.trim().toLocaleLowerCase('vi')).filter(Boolean)).size,
  ...extra,
});
const definitions = {
  journal: [
    idea('Đón nhận phản hồi với tâm thế bình thường, vui hoặc sẵn sàng lắng nghe', 'Bốn phản hồi mô tả sự bình thường, không quá buồn, vui khi có thêm góc nhìn hoặc sẵn sàng nghe góp ý. Đây mới là trạng thái tự thuật của từng người, chưa phải kết luận rằng mọi phản hồi đều đã được tiếp nhận trọn vẹn.', ['20261105-968fa7522f58634a', '20261105-865ea295130216f0', '20261105-053b972524594bb2', '20261105-0fa23d4b5a13ca38']),
    idea('Góp ý về phần đúc kết chưa hợp lý gây bối rối', 'Một học viên chưa rõ cách tách phần đúc kết và kể chuyện khi đang dùng chung một sơ đồ; đây là nhu cầu cần được làm rõ, không phải đánh giá chung của lớp.', ['20261105-f253bf5a264aa9a5'], { unique: true }),
  ],
  change: [
    idea('Kỹ năng kể chuyện bắt đầu rõ hơn qua thực hành', 'Ba nguồn ghi nhận nói tốt hơn, kể tự nhiên hơn hoặc quen dần với mô hình và cách mở đầu; mức độ tiến bộ khác nhau và chưa đồng nghĩa đã thành thạo.', ['20261105-b8ea968b79d2e301', '20261105-7ae7b75148b53f6c', '20261105-dc9679f001a676e1']),
    idea('Nhìn nhận giới hạn cá nhân và tôn trọng sự riêng biệt', 'Một học viên nhận biết kỹ năng kể chuyện còn hạn chế nhưng vẫn giữ sự tôn trọng đối với cách thể hiện riêng.', ['20261105-acfeac20c2448e2a'], { unique: true }),
    idea('Phản hồi đồng đội mở thêm góc nhìn và nhu cầu kaizen', 'Một học viên cho biết phản hồi của đồng đội giúp có thêm góc nhìn và thấy cần tiếp tục cải tiến.', ['20261105-cfb8922bd1c720f7'], { unique: true }),
    idea('Tư duy đa chiều và trả lời phản biện vẫn còn yếu', 'Một học viên ghi nhận đã tiến bộ ở quan sát–phân tích–đúc kết nhưng vẫn gặp khó khi nhìn đa chiều và trả lời câu hỏi phản biện.', ['20261105-dc9679f001a676e1'], { unique: true }),
  ],
  kaizen: [
    idea('Bài nộp hiện chủ yếu là ảnh hoặc video, chưa đủ văn bản để đúc kết điểm kaizen', 'Bảy nguồn hiện chủ yếu cung cấp liên kết, tệp đính kèm hoặc ghi chú sẽ bổ sung sơ đồ. Bản tin giữ trạng thái chờ đọc, không suy diễn nội dung từ liên kết và chưa tạo kết luận kaizen.', ['20261105-16a003bda17929bd', '20261105-d599e3d0fb3f4254', '20261105-de3a494ffd540d75', '20261105-3c0f5ef499463ce7', '20261105-926bcf35582f2712', '20261105-e692ddc22726dca2', '20261105-37005bf547144d19'], { reviewRequired: true }),
  ],
  strength: [
    idea('Khuyến khích sự chủ động chia sẻ và tăng thời lượng thực hành', 'Hai ý kiến muốn phát huy việc chủ động chia sẻ hoặc luyện tập nhiều hơn; chưa có đủ chi tiết để quy thành một phương thức bắt buộc.', ['20261105-d3c8017fcddb2b7a', '20261105-b27a5d6b575c1585']),
    idea('Trân trọng chia sẻ từ học viên cũ và mong Thầy chia sẻ thêm', 'Hai nguồn đánh giá cao hoặc mong tăng phần chia sẻ từ người có trải nghiệm, gồm học viên cũ và Thầy.', ['20261105-ab0a281806c14531', '20261105-66413b33d4049251']),
  ],
  improve: [
    idea('Làm ít bài hơn nhưng lặp lại kỹ và xem lại cốt truyện', 'Hai nguồn hướng tới chất lượng: xem lại cốt truyện và ưu tiên một bài mỗi tuần để làm đi làm lại kỹ hơn.', ['20261105-e353a43ab682d5fe', '20261105-9e5dab4f8fc4a824']),
    idea('Góp ý nên được xử lý ngay trên lớp để bớt cục bộ và tốn thời gian', 'Một học viên thấy hành trình góp ý còn cục bộ trong nhóm, còn lớp mở thêm lại khó theo vì tốn thời gian; đề xuất giải quyết ngay trong buổi học.', ['20261105-6d3cae52b488dabd'], { unique: true }),
  ],
  action: [
    idea('Đồng hành, góp ý và mở rộng tương tác với đồng đội', 'Bốn nguồn cam kết đồng hành, xem bài, góp ý chân thành trong nhóm hoặc tương tác và phản hồi cho học viên khác thôn.', ['20261105-626c0222d2a09e49', '20261105-f1f1480ce5fd06ed', '20261105-ea3264a0b6034cb3', '20261105-7b7730be7a5c6569']),
    idea('Tăng mức thực hành cá nhân', 'Hai nguồn nêu làm bài đầy đủ hoặc làm nhiều bài hơn; đây là cam kết tự rèn, không phải nghĩa vụ BTC.', ['20261105-7ff137a395f3ae75', '20261105-ea3264a0b6034cb3']),
  ],
  questions: [
    idea('Thiếu thời gian vì trách nhiệm gia đình và công việc', 'Một học viên cho biết nguồn lực thời gian hạn chế nên bài chưa được chỉn chu. Bản tin chỉ giữ nhu cầu hỗ trợ khái quát và giữ riêng tên, nguyên văn.', ['20261105-26d192f69c9707bc'], { unique: true, privacyReviewSourceIds: ['20261105-26d192f69c9707bc'], requiresPrivacyReview: true }),
    idea('Cần hướng dẫn áp dụng các hệ quy chiếu vào câu chuyện bản thân', 'Một học viên chưa rõ cách đưa 4VTĐT, Ba gốc và Ikigai vào cốt truyện cá nhân, đồng thời muốn biết bài làm có đúng kỳ vọng của Thầy và BTC không.', ['20261105-6c5399160b657cd7'], { unique: true }),
  ],
};

const promptByGroup = Object.fromEntries(freshWeek.sources.map((source) => [source.group, source.questionPrompt]));
const sources = freshWeek.sources.map((source) => source.id === '20261105-26d192f69c9707bc' ? {
  id: source.id,
  group: source.group,
  questionColumn: source.questionColumn,
  privacyHeld: true,
  heldStatus: 'Nguồn giữ riêng; không công bố tên hoặc nguyên văn.',
} : source);
const summaries = Object.entries(definitions).map(([id, ideas]) => ({
  id,
  title: `Câu hỏi: ${promptByGroup[id]}`,
  method: 'chatgpt-semantic-draft',
  coverage: {
    reviewedSourceCount: freshWeek.sources.filter((source) => source.group === id).length,
    representedSourceCount: new Set(ideas.flatMap((item) => item.sourceIds)).size,
    status: 'ongoing',
  },
  ideas,
}));
const updated = {
  ...freshWeek,
  complete: false,
  summaries,
  sources,
  reviewQueue: [
    ...freshWeek.reviewQueue,
    ...freshWeek.sources.filter((source) => source.group === 'kaizen').map((source) => ({ sourceId: source.id, reason: 'attachment-only-needs-review' })),
    { sourceId: '20261105-aaf4649aee7cec9d', reason: 'non-substantive-no-improvement-yet' },
    { sourceId: '20261105-168eb113d313e2c0', reason: 'non-substantive-general-response' },
    { sourceId: '20261105-e0631cb0e7b37019', reason: 'non-substantive-no-improvement-yet' },
  ],
  checkpoint: {
    status: 'ongoing',
    reviewedAt: checkedAt,
    method: 'Native ChatGPT semantic reading; no external AI API.',
    sourceCount: freshWeek.sources.length,
  },
};
current.weeks = current.weeks.map((week) => week.tab === tab ? updated : week);
if (stableHash(current.weeks.filter((week) => ['20261022', '20261029'].includes(week.tab))) !== protectedBefore) throw new Error('Protected reviewed weeks changed');
current.generatedAt = checkedAt;
current.method = 'chatgpt-semantic-reviewed-with-ongoing-draft';
const temporary = `${dataPath}.next`;
fs.writeFileSync(temporary, `${JSON.stringify(current, null, 2)}\n`);
fs.renameSync(temporary, dataPath);
console.log(`Updated ${tab}: ${freshWeek.submissionCount} WEEK rows, ${freshWeek.sources.length} sources.`);
