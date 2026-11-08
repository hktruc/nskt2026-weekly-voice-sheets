const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const TITLES = {
  journal: 'Câu hỏi: Nhật ký cảm xúc từ phản hồi đồng đội',
  change: 'Câu hỏi: Chuyển hóa trong học tập và đời sống',
  kaizen: 'Câu hỏi: Điểm tự kaizen từ chấm bài đồng đội',
  strength: 'Câu hỏi: Điểm tốt của lớp cần phát huy',
  improve: 'Câu hỏi: Điểm lớp học cần cải thiện',
  action: 'Câu hỏi: Hành động học viên cam kết đóng góp',
  questions: 'Câu hỏi: Khó khăn và câu hỏi gửi BTC/Thầy',
};
let model;
let current;
let sourceMap;
let activeIdea;
let activeGroup;
const personKey = (source) => (source.name || '').trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ');
const privateIds = (idea) => new Set(idea.privacyReviewSourceIds || []);
const questionText = (title) => String(title || '').replace(/^Câu hỏi\s*:\s*/i, '').trim();

function parseDue(due) {
  const parts = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(String(due || '').trim());
  if (!parts) return NaN;
  const [, day, month, year, hour, minute] = parts.map(Number);
  const local = new Date(0);
  local.setUTCFullYear(year, month - 1, day);
  local.setUTCHours(hour, minute, 0, 0);
  if (local.getUTCFullYear() !== year || local.getUTCMonth() !== month - 1 || local.getUTCDate() !== day || local.getUTCHours() !== hour || local.getUTCMinutes() !== minute) return NaN;
  // Due dates are local to Asia/Ho_Chi_Minh (UTC+07), not the viewer's time zone.
  return local.getTime() - 7 * 60 * 60 * 1000;
}

function deadlineStatus(due, now = Date.now()) {
  const deadline = parseDue(due);
  if (!Number.isFinite(deadline)) return 'chưa rõ hạn';
  return now > deadline ? 'đã qua hạn' : 'trong hạn';
}

function snapshotTime(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'chưa rõ thời điểm cập nhật';
  return `${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(timestamp)} (giờ Việt Nam)`;
}

function sourcesFor(idea) {
  const held = privateIds(idea);
  return [...new Set(idea.sourceIds || [])].filter((id) => !held.has(id))
    .map((id) => sourceMap[id]).filter((source) => source && !source.privacyHeld);
}

function peopleFor(idea) {
  const seen = new Set();
  return sourcesFor(idea).filter((source) => {
    const key = personKey(source);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function heldCount(idea) {
  return new Set([...(idea.privacyReviewSourceIds || []), ...(idea.sourceIds || []).filter((id) => sourceMap[id]?.privacyHeld)]).size;
}

function countLabel(idea) {
  const held = heldCount(idea);
  return `${peopleFor(idea).length} tên học viên · ${sourcesFor(idea).length} nguồn công khai${held ? ` + ${held} nguồn giữ riêng` : ''}`;
}

function reviewStatus(week, reviewed) {
  if (typeof week.textReviewComplete === 'boolean' || typeof week.mediaReviewComplete === 'boolean' || week.collectionClosure !== undefined) {
    const text = week.textReviewComplete === true
      ? 'Đã đọc xong phần văn bản trong bản dữ liệu này; các ý được tổng hợp từ phần văn bản có thể công khai.'
      : 'Việc đọc phần văn bản trong bản dữ liệu này chưa được xác nhận hoàn tất.';
    const media = week.mediaReviewComplete === false
      ? `Phần nội dung liên kết/media chưa được đọc và diễn giải đầy đủ.${Number.isInteger(week.coverage?.mediaOnlyUninterpreted) ? ` Có ${week.coverage.mediaOnlyUninterpreted} nguồn chỉ chứa media chưa được diễn giải.` : ''}${week.coverage?.linkedMediaAlongsideText ? ' Các liên kết/media đi kèm câu trả lời văn bản cũng chưa được mở hoặc diễn giải; ý tổng hợp chỉ dựa trên văn bản độc lập.' : ''}`
      : week.mediaReviewComplete === true ? 'Việc đọc media trong phạm vi bản dữ liệu này đã hoàn tất.' : 'Chưa xác nhận tình trạng đọc media.';
    const closure = week.collectionClosure === 'closed' ? 'Đã xác nhận đóng thu thập.' : 'Chưa xác nhận việc thu thập đã đóng; hạn nộp không xác nhận mọi học viên đã nộp.';
    return `${text} ${media} ${closure}`;
  }
  return reviewed
    ? 'Bản tin đã được ChatGPT đọc và tổng hợp ngữ nghĩa từ các phản hồi có trong bản dữ liệu này; mỗi ý đều truy ngược được nguồn. Số bài ghi nhận không xác nhận mọi học viên đã nộp.'
    : 'Phân tích và tổng hợp bản dữ liệu này chưa hoàn tất; nội dung hiện tại là bản nháp, chưa dùng làm kết luận chính thức.';
}

const dataUrl = `data/weeks.json?v=${Date.now()}-${Math.random().toString(36).slice(2)}`;
fetch(dataUrl, { cache: 'no-store' }).then((response) => response.json()).then((data) => {
  model = data;
  const select = $('#week');
  const weeks = data.weeks.slice().sort((a, b) => String(b.tab).localeCompare(String(a.tab)));
  weeks.forEach((week) => select.add(new Option(`${week.tab} · ${week.submissionCount} bài · ${deadlineStatus(week.due)}`, week.tab)));
  if (weeks.length) select.value = weeks[0].tab;
  select.onchange = render;
  $('#search').oninput = render;
  render();
}).catch(() => { $('#groups').innerHTML = '<p class="empty">Không tải được dữ liệu.</p>'; });

function render() {
  current = model.weeks.find((week) => week.tab === $('#week').value) || model.weeks.at(-1);
  sourceMap = Object.fromEntries(current.sources.map((source) => [source.id, source]));
  const reviewed = current.summaries.length > 0 && current.summaries.every((group) => group.method === 'chatgpt-semantic-reviewed');
  document.querySelector('aside').textContent = `Thời điểm dữ liệu: ${snapshotTime(model.generatedAt)}. ${reviewStatus(current, reviewed)}`;
  const query = $('#search').value.trim().toLocaleLowerCase('vi');
  $('#stats').innerHTML = `<div class="stat"><b>${current.submissionCount}</b><span>bài WEEK</span></div><div class="stat"><b>${current.answerCount}</b><span>câu trả lời có nội dung</span></div><div class="stat"><b>${esc(current.due || current.tab)}</b><span>hạn nộp · ${deadlineStatus(current.due)}</span></div>`;
  $('#groups').innerHTML = current.summaries.map((group) => {
    const ideas = (group.ideas || []).map((idea, index) => ({ idea, index })).filter(({ idea }) => !query || [idea.title, idea.summary, ...sourcesFor(idea).map((source) => source.name), ...sourcesFor(idea).map((source) => source.answer)].join(' ').toLocaleLowerCase('vi').includes(query));
    if (!ideas.length) return '';
    const title = group.title || TITLES[group.id];
    return `<section class="group"><header class="question-block"><span class="question-label">Câu hỏi</span><h2>${esc(questionText(title))}</h2><p class="question-meta">${ideas.length} ý chính được đúc kết từ các phản hồi liên quan</p></header><div class="ideas">${ideas.map(({ idea, index }, displayIndex) => `<article class="idea"><span class="badge">Ý ${displayIndex + 1} · ${countLabel(idea)}</span><h3>${esc(idea.title)}</h3>${idea.summary ? `<p>${esc(idea.summary)}</p>` : ''}<button class="contributors" data-group="${group.id}" data-index="${index}">Xem học viên đóng góp ý này</button></article>`).join('')}</div></section>`;
  }).join('') || '<p class="empty">Không tìm thấy kết quả phù hợp.</p>';
  document.querySelectorAll('.contributors').forEach((button) => { button.onclick = () => openContributors(button.dataset.group, Number(button.dataset.index)); });
}

function openContributors(groupId, index) {
  activeGroup = current.summaries.find((group) => group.id === groupId);
  activeIdea = activeGroup.ideas[index];
  const people = peopleFor(activeIdea);
  const held = heldCount(activeIdea);
  $('#detail').innerHTML = `<span class="badge">${esc(activeGroup.title || TITLES[groupId])}</span><h2>${esc(activeIdea.title)}</h2>${activeIdea.summary ? `<p>${esc(activeIdea.summary)}</p>` : ''}<p class="meta">${people.length} tên học viên · ${sourcesFor(activeIdea).length} nguồn công khai hỗ trợ ý này. Tên trùng được gộp bảo thủ vì nguồn công khai không có mã học viên; cùng tên không chứng minh cùng một người.${held ? ` ${held} nguồn có hoàn cảnh riêng được giữ lại trong thống kê nhưng không hiện tên/nguyên văn.` : ''} Chọn tên để xem nguyên văn.</p><div class="people-list">${people.map((source) => `<button data-source="${esc(source.id)}">${esc(source.name)}</button>`).join('')}</div>`;
  document.querySelectorAll('[data-source]').forEach((button) => { button.onclick = () => openOccurrences(sourceMap[button.dataset.source]); });
  if (!$('#sourceDialog').open) $('#sourceDialog').showModal();
}

function openOccurrences(person) {
  if (!person) return;
  const sources = sourcesFor(activeIdea).filter((source) => personKey(source) === personKey(person));
  if (sources.length === 1) return openSource(sources[0]);
  if (!sources.length) return;
  $('#detail').innerHTML = `<button class="back">← Danh sách học viên</button><h2>${esc(person.name)}</h2><p class="meta">${sources.length} nguồn có cùng tên chuẩn hóa. Đây là các lần xuất hiện riêng biệt, không xác nhận cùng một người. Chọn nguồn để xem nguyên văn, kể cả khi câu trả lời trùng nhau.</p><div class="people-list">${sources.map((source, index) => `<button data-occurrence="${esc(source.id)}">Nguồn ${index + 1} · Tab ${esc(current.tab)} · hàng ${esc(source.row)} · ${esc(source.questionColumn || source.group)} · nộp lúc ${esc(source.submitted || 'không rõ')}</button>`).join('')}</div>`;
  document.querySelectorAll('[data-occurrence]').forEach((button) => { button.onclick = () => openSource(sourceMap[button.dataset.occurrence]); });
  $('.back').onclick = () => openContributors(activeGroup.id, activeGroup.ideas.indexOf(activeIdea));
}

function openSource(source) {
  if (!source || !sourcesFor(activeIdea).some((item) => item.id === source.id)) return;
  const multiple = sourcesFor(activeIdea).filter((item) => personKey(item) === personKey(source)).length > 1;
  $('#detail').innerHTML = `<button class="back">← ${multiple ? 'Danh sách nguồn' : 'Danh sách học viên'}</button><span class="badge">${esc(source.questionColumn || source.group)}</span><h2>${esc(source.name)}</h2><h3>Câu hỏi gốc</h3><div class="answer">${esc(source.questionPrompt || TITLES[source.group])}</div><h3>Câu trả lời gốc</h3><div class="answer">${esc(source.answer)}</div><p class="meta">Tab ${esc(current.tab)} · hàng ${esc(source.row)} · hạn nộp ${esc(source.due || 'không rõ')} · nộp lúc ${esc(source.submitted || 'không rõ')} · mã ${esc(source.id)}</p>`;
  $('.back').onclick = () => multiple ? openOccurrences(source) : openContributors(activeGroup.id, activeGroup.ideas.indexOf(activeIdea));
}

$('.close').onclick = () => $('#sourceDialog').close();
$('#sourceDialog').onclick = (event) => { if (event.target === $('#sourceDialog')) $('#sourceDialog').close(); };
