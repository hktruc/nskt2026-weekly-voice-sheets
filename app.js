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

function peopleFor(idea) {
  const seen = new Set();
  const held = privateIds(idea);
  return (idea.sourceIds || []).filter((id) => !held.has(id)).map((id) => sourceMap[id]).filter((source) => {
    if (!source) return false;
    const key = personKey(source);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countLabel(idea) {
  const publicCount = peopleFor(idea).length;
  const held = privateIds(idea).size;
  return `${publicCount} tên học viên${held ? ` + ${held} nguồn giữ riêng` : ''}`;
}

fetch('data/weeks.json?v=privacy-redacted-v2').then((response) => response.json()).then((data) => {
  model = data;
  const select = $('#week');
  data.weeks.slice().reverse().forEach((week) => select.add(new Option(`${week.tab} · ${week.submissionCount} bài${week.complete ? '' : ' · đang thu'}`, week.tab)));
  const preferred = data.weeks.slice().reverse().find((week) => week.complete);
  if (preferred) select.value = preferred.tab;
  select.onchange = render;
  $('#search').oninput = render;
  render();
}).catch(() => { $('#groups').innerHTML = '<p class="empty">Không tải được dữ liệu.</p>'; });

function render() {
  current = model.weeks.find((week) => week.tab === $('#week').value) || model.weeks.at(-1);
  sourceMap = Object.fromEntries(current.sources.map((source) => [source.id, source]));
  const reviewed = current.summaries.every((group) => group.method === 'chatgpt-semantic-reviewed');
  document.querySelector('aside').textContent = reviewed
    ? 'Bản tin đã được ChatGPT đọc và tổng hợp ngữ nghĩa từ toàn bộ phản hồi có trong snapshot; mỗi ý đều truy ngược được nguồn.'
    : 'Tuần đang thu bài – nội dung hiện tại là bản nháp, chưa dùng làm kết luận chính thức.';
  const query = $('#search').value.trim().toLocaleLowerCase('vi');
  $('#stats').innerHTML = `<div class="stat"><b>${current.submissionCount}</b><span>bài WEEK${current.complete ? '' : ' · đang thu bài'}</span></div><div class="stat"><b>${current.answerCount}</b><span>câu trả lời có nội dung</span></div><div class="stat"><b>${esc(current.due || current.tab)}</b><span>hạn nộp</span></div>`;
  $('#groups').innerHTML = current.summaries.map((group) => {
    const ideas = (group.ideas || []).map((idea, index) => ({ idea, index })).filter(({ idea }) => !query || [idea.title, idea.summary, ...idea.sourceIds.map((id) => sourceMap[id]?.name), ...idea.sourceIds.map((id) => sourceMap[id]?.answer)].join(' ').toLocaleLowerCase('vi').includes(query));
    if (!ideas.length) return '';
    return `<section class="group"><h2>${esc(group.title || TITLES[group.id])}</h2><div class="ideas">${ideas.map(({ idea, index }, displayIndex) => `<article class="idea"><span class="badge">Ý ${displayIndex + 1} · ${countLabel(idea)}</span><h3>${esc(idea.title)}</h3>${idea.summary ? `<p>${esc(idea.summary)}</p>` : ''}<button class="contributors" data-group="${group.id}" data-index="${index}">Xem học viên đóng góp ý này</button></article>`).join('')}</div></section>`;
  }).join('') || '<p class="empty">Không tìm thấy kết quả phù hợp.</p>';
  document.querySelectorAll('.contributors').forEach((button) => { button.onclick = () => openContributors(button.dataset.group, Number(button.dataset.index)); });
}

function openContributors(groupId, index) {
  activeGroup = current.summaries.find((group) => group.id === groupId);
  activeIdea = activeGroup.ideas[index];
  const people = peopleFor(activeIdea);
  const held = privateIds(activeIdea).size;
  $('#detail').innerHTML = `<span class="badge">${esc(activeGroup.title || TITLES[groupId])}</span><h2>${esc(activeIdea.title)}</h2>${activeIdea.summary ? `<p>${esc(activeIdea.summary)}</p>` : ''}<p class="meta">${people.length} tên học viên công khai hỗ trợ ý này. Tên trùng được gộp bảo thủ vì nguồn công khai không có mã học viên.${held ? ` ${held} nguồn có hoàn cảnh riêng được giữ lại trong thống kê nhưng không hiện tên/nguyên văn.` : ''} Chọn tên để xem nguyên văn.</p><div class="people-list">${people.map((source) => `<button data-source="${source.id}">${esc(source.name)}</button>`).join('')}</div>`;
  document.querySelectorAll('[data-source]').forEach((button) => { button.onclick = () => openSource(sourceMap[button.dataset.source]); });
  $('#sourceDialog').showModal();
}

function openSource(source) {
  $('#detail').innerHTML = `<button class="back">← Danh sách học viên</button><span class="badge">${esc(source.questionColumn || source.group)}</span><h2>${esc(source.name)}</h2><h3>Câu hỏi gốc</h3><div class="answer">${esc(source.questionPrompt || TITLES[source.group])}</div><h3>Câu trả lời gốc</h3><div class="answer">${esc(source.answer)}</div><p class="meta">Tab ${esc(current.tab)} · hàng ${source.row} · hạn nộp ${esc(source.due || 'không rõ')} · nộp lúc ${esc(source.submitted || 'không rõ')} · mã ${esc(source.id)}</p>`;
  $('.back').onclick = () => openContributors(activeGroup.id, activeGroup.ideas.indexOf(activeIdea));
}

$('.close').onclick = () => $('#sourceDialog').close();
$('#sourceDialog').onclick = (event) => { if (event.target === $('#sourceDialog')) $('#sourceDialog').close(); };
