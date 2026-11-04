import fs from 'node:fs';
import crypto from 'node:crypto';

const freshPath = process.env.FRESH_SNAPSHOT;
if (!freshPath) throw new Error('FRESH_SNAPSHOT is required');
const checkedAt = process.env.CHECKED_AT || new Date().toISOString();
const dataPath = 'data/weeks.json';
const current = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const fresh = JSON.parse(fs.readFileSync(freshPath, 'utf8'));
const freshWeek = fresh.weeks.find((week) => week.tab === '20261105');
if (!freshWeek) throw new Error('20261105 missing');

const reviewedIdPairs = new Map(Object.entries({
  '20261022-1338c7e08a8e1cbf': '20261022-e24c1166952d9951',
  '20261022-16a8154270501998': '20261022-7e881f56531ef6e8',
  '20261022-f623d232aa8466a8': '20261022-c1e65ae12ab51efc',
  '20261022-39fd3f7789430990': '20261022-4dc08f9fcedef90f',
  '20261022-989c82567375abd1': '20261022-86904668be83d03e',
  '20261022-786edbfd498c99b1': '20261022-3d102a2cc6b8a697',
  '20261022-8429cd2c9746b9a2': '20261022-2c719e96dd5b5a91',
  '20261029-d07fd012a0c5a897': '20261029-618a43596e3b55f5',
  '20261029-a551a5c2d00e76ee': '20261029-c196c53b237f00f5',
  '20261029-3e0d76cae464e8ad': '20261029-ca8a001a8e313b67',
  '20261029-03d88408c88d0fb7': '20261029-1cf1f21ed28632c2',
  '20261029-3fee1c7083e118d2': '20261029-cd39ae6f88ca316e',
  '20261029-523552f4975baaac': '20261029-2e08951ee1aacbc0',
  '20261029-37d7a3b454e527cb': '20261029-fbd650790dce669c',
}));
const editedOldId = '20261029-96dae1ad93b1ea95';
const editedNewId = '20261029-13439c4275123f13';

const replaceIds = (value) => {
  if (Array.isArray(value)) return value.map(replaceIds);
  if (!value || typeof value !== 'object') return reviewedIdPairs.get(value) || value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [reviewedIdPairs.get(key) || key, replaceIds(item)]));
};

for (const tab of ['20261022', '20261029']) {
  const index = current.weeks.findIndex((week) => week.tab === tab);
  const freshReviewed = fresh.weeks.find((week) => week.tab === tab);
  if (index < 0 || !freshReviewed) throw new Error(`${tab} missing`);
  const reconciled = replaceIds(current.weeks[index]);
  const freshMap = new Map(freshReviewed.sources.map((source) => [source.id, source]));
  reconciled.sources = reconciled.sources.map((source) => {
    if (source.privacyHeld) return source;
    const nextId = reviewedIdPairs.get(source.id) || source.id;
    return freshMap.get(nextId) || source;
  });
  current.weeks[index] = reconciled;
}

// One previously empty kaizen response now adds the concrete need for a diagram.
{
  const week = current.weeks.find((item) => item.tab === '20261029');
  const freshSource = fresh.weeks.find((item) => item.tab === '20261029').sources.find((source) => source.id === editedNewId);
  week.sources = week.sources.map((source) => source.id === editedOldId ? freshSource : source);
  const group = week.summaries.find((item) => item.id === 'kaizen');
  const target = group.ideas.find((item) => item.title === 'Sơ đồ ít chữ, rõ cấu trúc và dễ nhìn');
  if (!target.sourceIds.includes(editedNewId)) target.sourceIds.push(editedNewId);
  group.coverage.excludedSourceIds = group.coverage.excludedSourceIds.filter((id) => id !== editedOldId);
  delete group.coverage.exclusionReasons[editedOldId];
  for (const key of ['substantiveSourceCount', 'coveredSourceCount', 'assignedSourceCount']) group.coverage[key] += 1;
  group.coverage.excludedSourceCount -= 1;
}

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
    idea('Đón nhận phản hồi với niềm vui hoặc tâm thế sẵn sàng lắng nghe', 'Nhiều phản hồi mô tả sự bình thường, vui, biết ơn hoặc sẵn sàng nghe góp ý để có thêm góc nhìn. Đây là trạng thái tự thuật của từng người, không có nghĩa mọi lời khen chê đều đã được tiếp nhận trọn vẹn.', ['20261105-968fa7522f58634a', '20261105-865ea295130216f0', '20261105-053b972524594bb2', '20261105-0fa23d4b5a13ca38', '20261105-48524732afac67b7']),
    idea('Khen chê vẫn có thể khơi mong cầu, so sánh và giận', 'Hai học viên kể thật về chạnh lòng khi không được khen như kỳ vọng, thấy mình còn kém, không tin lời khen hoặc giận khi bị chê. Giữ đây là trải nghiệm chưa quân bình, không kể thành chuyển hóa đã hoàn tất.', ['20261105-d1113f94763dca47', '20261105-01463a537164c46f'], { conflict: true }),
    idea('Chưa có đủ nhận xét để viết nhật ký', 'Một học viên sẽ bổ sung sau khi nhận được nhận xét. Đây là tình trạng chưa đủ đầu vào, không suy diễn thành sự thiếu quan tâm của lớp.', ['20261105-83c2c758f462fc43'], { unique: true }),
    idea('Góp ý về phần đúc kết chưa hợp lý gây bối rối', 'Một học viên chưa rõ cách tách phần đúc kết và kể chuyện khi đang dùng chung một sơ đồ; đây là nhu cầu cần được làm rõ, không phải đánh giá chung của lớp.', ['20261105-f253bf5a264aa9a5'], { unique: true }),
  ],
  change: [
    idea('Kỹ năng kể chuyện bắt đầu rõ hơn qua thực hành', 'Ba nguồn ghi nhận nói tốt hơn, kể tự nhiên hơn hoặc quen dần với mô hình và cách mở đầu; mức độ tiến bộ khác nhau và chưa đồng nghĩa đã thành thạo.', ['20261105-b8ea968b79d2e301', '20261105-7ae7b75148b53f6c', '20261105-dc9679f001a676e1']),
    idea('Làm bài kỹ hơn, bớt đối phó và chủ động nghe lại', 'Một học viên cho biết mình làm kỹ hơn, giảm tâm thế đối phó và nghe đi nghe lại lời hướng dẫn để rút kinh nghiệm.', ['20261105-2b49f2c9d8cddc28'], { unique: true }),
    idea('Nhìn lại cảm xúc như một khoảnh khắc vô thường', 'Qua việc kể lại hành trình, một học viên thấy những lúc từng rất tồi tệ chỉ là khoảnh khắc và nhận ra tính vô thường của sân si.', ['20261105-0347021e2866f397'], { unique: true }),
    idea('Nhận thức được phản ứng chưa tốt nhưng vẫn khó quản trị cảm xúc', 'Một học viên nhận ra lời nói khó nghe khi tức giận và đã phân tích nguyên nhân–hậu quả, nhưng vẫn chưa thoát được phản ứng cũ; đây là khoảng cách giữa hiểu và làm.', ['20261105-24e470d7d527f83d'], { unique: true, conflict: true }),
    idea('Đưa kể chuyện vào gia đình và hình thành thói quen học từ đồng đội', 'Một học viên dùng sơ đồ để kể cùng gia đình, khuyến khích con kể lại và thay video ngắn bằng việc nghe bài của đồng đội để nhớ chuyện và mở góc nhìn.', ['20261105-7e4bcba50677a1f3'], { unique: true }),
    idea('Nhìn nhận giới hạn cá nhân và tôn trọng sự riêng biệt', 'Một học viên nhận biết kỹ năng kể chuyện còn hạn chế nhưng vẫn giữ sự tôn trọng đối với cách thể hiện riêng.', ['20261105-acfeac20c2448e2a'], { unique: true }),
    idea('Phản hồi đồng đội mở thêm góc nhìn và nhu cầu kaizen', 'Một học viên cho biết phản hồi của đồng đội giúp có thêm góc nhìn và thấy cần tiếp tục cải tiến.', ['20261105-cfb8922bd1c720f7'], { unique: true }),
    idea('Tư duy đa chiều và trả lời phản biện vẫn còn yếu', 'Một học viên ghi nhận đã tiến bộ ở quan sát–phân tích–đúc kết nhưng vẫn gặp khó khi nhìn đa chiều và trả lời câu hỏi phản biện.', ['20261105-dc9679f001a676e1'], { unique: true }),
  ],
  kaizen: [
    idea('Bài nộp hiện chủ yếu là ảnh hoặc video, chưa đủ văn bản để đúc kết điểm kaizen', 'Mười hai nguồn hiện chủ yếu cung cấp liên kết, tệp đính kèm hoặc ghi chú sẽ bổ sung sơ đồ. Bản tin giữ trạng thái chờ đọc, không suy diễn nội dung từ liên kết và chưa tạo kết luận kaizen.', freshWeek.sources.filter((source) => source.group === 'kaizen').map((source) => source.id), { reviewRequired: true }),
  ],
  strength: [
    idea('Thảo luận nhóm nhỏ giúp chủ động chia sẻ, luyện kể và mở góc nhìn', 'Nhiều ý kiến muốn phát huy thời gian trao đổi trong nhóm nhỏ, chủ động chia sẻ và thực hành kể trước nhóm để tăng khả năng trình bày.', ['20261105-d3c8017fcddb2b7a', '20261105-b27a5d6b575c1585', '20261105-5780ff6e8654db7d', '20261105-219622fb6fe8922a', '20261105-6e326e4635a3fcdb']),
    idea('Trân trọng chia sẻ từ học viên cũ và mong Thầy chia sẻ thêm', 'Hai nguồn đánh giá cao hoặc mong tăng phần chia sẻ từ người có trải nghiệm, gồm học viên cũ và Thầy.', ['20261105-ab0a281806c14531', '20261105-66413b33d4049251']),
    idea('Chữa thêm bài để thấy nhiều góc nhìn', 'Một học viên mong có thêm người được chữa bài để cả lớp nhìn thấy nhiều góc nhìn mới hơn.', ['20261105-53baa66ac4a92a9f'], { unique: true }),
  ],
  improve: [
    idea('Làm ít bài hơn nhưng lặp lại kỹ và xem lại cốt truyện', 'Hai nguồn hướng tới chất lượng: xem lại cốt truyện và ưu tiên một bài mỗi tuần để làm đi làm lại kỹ hơn.', ['20261105-e353a43ab682d5fe', '20261105-9e5dab4f8fc4a824']),
    idea('Góp ý nên được xử lý ngay trên lớp để bớt cục bộ và tốn thời gian', 'Một học viên thấy hành trình góp ý còn cục bộ trong nhóm, còn lớp mở thêm lại khó theo và tốn thời gian; đề xuất giải quyết ngay trong buổi học.', ['20261105-6d3cae52b488dabd'], { unique: true }),
    idea('Cần cải thiện kỹ thuật Zoom, độ ồn và hướng dẫn chấm bài', 'Một học viên nêu ba vướng mắc vận hành riêng: lỗi kỹ thuật khi Zoom, phòng học ồn khi chia sẻ và phần chấm bài cần được hướng dẫn kỹ hơn.', ['20261105-d3b9d9299fc1a3c6'], { unique: true }),
    idea('Tự quản lý thời gian tốt hơn', 'Một học viên trả lời bằng nhu cầu tự quản lý thời gian. Đây là tự kaizen, không chuyển thành nghĩa vụ của BTC.', ['20261105-1c0348d0138a3ce0'], { unique: true, intent: 'self-improvement' }),
    idea('Giới hạn thời gian chữa bài, đa dạng hoạt động và phản ánh trung thực hơn', 'Một học viên đề nghị giới hạn thời lượng chữa từng người để nhiều người được tham gia, đa dạng hoạt động và để bài tập ngày phản ánh trải nghiệm thật thay vì tích ô đối phó.', ['20261105-d47855ddee44a176'], { unique: true }),
  ],
  action: [
    idea('Đồng hành, góp ý và nhắc đồng đội cùng học', 'Nhiều nguồn cam kết đồng hành, xem bài, góp ý chân thành hoặc nhắc đồng đội làm bài; hỗ trợ nhằm cùng tiến bộ chứ không chỉ thúc ép.', ['20261105-626c0222d2a09e49', '20261105-f1f1480ce5fd06ed', '20261105-ea3264a0b6034cb3', '20261105-7b7730be7a5c6569', '20261105-ba08585b397456da']),
    idea('Làm bài đầy đủ, sớm hơn và tăng mức thực hành cá nhân', 'Các nguồn nêu làm bài đầy đủ, làm sớm hoặc làm nhiều bài hơn; đây là cam kết tự rèn, không phải nghĩa vụ BTC.', ['20261105-7ff137a395f3ae75', '20261105-ea3264a0b6034cb3', '20261105-ba08585b397456da']),
    idea('Đi học đủ, đúng giờ và giữ kỷ luật', 'Hai học viên cam kết hiện diện đúng giờ hoặc giữ kỷ luật cá nhân để góp phần giúp thôn và lớp tốt hơn.', ['20261105-04b4808b9a1bbf2a', '20261105-dc18bd6ceab191d7']),
  ],
  questions: [
    idea('Thiếu thời gian và trách nhiệm gia đình, công việc', 'Một học viên cho biết nguồn lực thời gian hạn chế nên bài chưa được chỉn chu. Bản tin chỉ giữ nhu cầu hỗ trợ khái quát và giữ riêng tên, nguyên văn.', ['20261105-26d192f69c9707bc'], { unique: true, privacyReviewSourceIds: ['20261105-26d192f69c9707bc'], requiresPrivacyReview: true }),
    idea('Cần hướng dẫn áp dụng các hệ quy chiếu vào câu chuyện bản thân', 'Một học viên chưa rõ cách đưa 4VTĐT, Ba gốc và Ikigai vào cốt truyện cá nhân, đồng thời muốn biết bài làm có đúng kỳ vọng của Thầy và BTC không.', ['20261105-6c5399160b657cd7'], { unique: true }),
    idea('Muốn biết hành động cụ thể để thoát khỏi phản ứng tiêu cực lặp lại', 'Một học viên nhận diện rõ một tình huống và phản ứng khó chịu đã lặp lại lâu dài, mong được hướng dẫn hành động cụ thể để thay đổi.', ['20261105-8d0b80fb705d9844'], { unique: true }),
    idea('Tự nhận còn yếu ở phần đúc kết', 'Một học viên nêu mình còn yếu ở phần đúc kết nhưng sẽ cố gắng. Đây là khó khăn tự nhận, chưa phải câu hỏi cụ thể gửi BTC.', ['20261105-88530cc37c99161c'], { unique: true, intent: 'self-improvement' }),
  ],
};

const promptByGroup = Object.fromEntries(freshWeek.sources.map((source) => [source.group, source.questionPrompt]));
const heldId = '20261105-26d192f69c9707bc';
const sources = freshWeek.sources.map((source) => source.id === heldId ? {
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

const nonSubstantive = [
  ['20261105-168eb113d313e2c0', 'non-substantive-general-response'],
  ['20261105-aaf4649aee7cec9d', 'non-substantive-no-improvement-yet'],
  ['20261105-e0631cb0e7b37019', 'non-substantive-no-improvement-yet'],
  ['20261105-3dcb1b0a9df3ea00', 'non-substantive-no-improvement-yet'],
  ['20261105-53d271e0fb2eda4a', 'non-substantive-no-question-yet'],
];
const updated = {
  ...freshWeek,
  complete: false,
  summaries,
  sources,
  reviewQueue: [
    ...freshWeek.reviewQueue,
    ...freshWeek.sources.filter((source) => source.group === 'kaizen').map((source) => ({ sourceId: source.id, reason: 'attachment-only-needs-review' })),
    ...nonSubstantive.map(([sourceId, reason]) => ({ sourceId, reason })),
  ],
  checkpoint: {
    status: 'ongoing',
    reviewedAt: checkedAt,
    method: 'Native ChatGPT semantic reading; no external AI API.',
    sourceCount: freshWeek.sources.length,
  },
};
current.weeks = current.weeks.map((week) => week.tab === '20261105' ? updated : week);

// Recompute public contributor counts after reviewed-source ID reconciliation.
for (const week of current.weeks) {
  const map = new Map(week.sources.map((source) => [source.id, source]));
  for (const group of week.summaries) for (const item of group.ideas) {
    const held = new Set(item.privacyReviewSourceIds || []);
    item.count = new Set(item.sourceIds.filter((id) => !held.has(id)).map((id) => map.get(id)?.name?.trim().toLocaleLowerCase('vi')).filter(Boolean)).size;
  }
}

const held = current.weeks.flatMap((week) => week.sources).filter((source) => source.privacyHeld);
const forbidden = ['name', 'answer', 'questionPrompt', 'row', 'submitted', 'due', 'fingerprint'];
if (held.length !== 6) throw new Error(`Expected 6 privacyHeld sources, found ${held.length}`);
for (const source of held) for (const key of forbidden) if (key in source) throw new Error(`privacyHeld leak: ${source.id}.${key}`);

current.generatedAt = checkedAt;
current.method = 'chatgpt-semantic-reviewed-with-ongoing-draft';
current.contentHash = crypto.createHash('sha256').update(JSON.stringify(current.weeks)).digest('hex');
const temporary = `${dataPath}.next`;
fs.writeFileSync(temporary, `${JSON.stringify(current, null, 2)}\n`);
fs.renameSync(temporary, dataPath);
console.log(`Updated 20261105: ${freshWeek.submissionCount} WEEK rows, ${freshWeek.sources.length} sources; reconciled reviewed IDs.`);
