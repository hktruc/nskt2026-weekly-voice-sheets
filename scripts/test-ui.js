const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const now = Date.parse('2026-11-06T08:30:00Z');

function fixture() {
  const week = (tab, due, complete) => ({ tab, due, complete, submissionCount: 2, answerCount: 4, summaries: [], sources: [] });
  const latest = week('20261105', '05/11/2026 23:00', false);
  latest.summaries = [{
    id: 'journal', title: 'Câu hỏi: Nhật ký', method: 'chatgpt-semantic-reviewed', ideas: [
      { title: 'Lắng nghe', summary: 'Chú tâm', sourceIds: ['first'] },
      { title: 'Thực hành <an toàn>', summary: 'Giữ <b>nhịp</b> học', sourceIds: ['an1', 'an2', 'binh', 'held'], privacyReviewSourceIds: ['held'] },
    ],
  }];
  latest.sources = [
    { id: 'first', name: 'Lan', answer: 'Lắng nghe đồng đội' },
    { id: 'an1', name: 'An <A>', answer: 'Luyện viết mỗi ngày <script>alert(1)</script>' },
    { id: 'an2', name: ' an <a> ', answer: 'Giữ thói quen' },
    { id: 'binh', name: 'Bình', answer: 'Đọc và ghi chép' },
    { id: 'held', privacyHeld: true },
  ].map((source, index) => source.privacyHeld ? source : ({ ...source, group: 'journal', questionColumn: 'C', questionPrompt: 'Nhật ký <gốc>', row: index + 2, due: latest.due, submitted: '05/11/2026 10:00' }));
  return { generatedAt: '2026-11-06T08:19:10.974998+00:00', weeks: [latest, week('20261022', '22/10/2026 23:00', true), week('20261029', '29/10/2026 23:00', true)] };
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

async function load(data = fixture(), random = 0.25) {
  const buttons = { contributors: [], sources: [], back: null };
  const element = () => ({ value: '', textContent: '', innerHTML: '' });
  const elements = Object.fromEntries(['#week', '#search', '#stats', '#groups', '#detail', '#sourceDialog', '.close', 'aside'].map((key) => [key, element()]));
  elements['#week'].options = [];
  elements['#week'].add = function (option) { this.options.push(option); if (!this.value) this.value = option.value; };
  Object.defineProperty(elements['#groups'], 'innerHTML', {
    get() { return this.html || ''; },
    set(html) {
      this.html = html;
      buttons.contributors = [...html.matchAll(/<button class="contributors" data-group="([^"]+)" data-index="([^"]+)">/g)].map((match) => ({ dataset: { group: match[1], index: match[2] } }));
    },
  });
  Object.defineProperty(elements['#detail'], 'innerHTML', {
    get() { return this.html || ''; },
    set(html) {
      this.html = html;
      buttons.sources = [...html.matchAll(/<button data-source="([^"]+)">/g)].map((match) => ({ dataset: { source: match[1] } }));
      buttons.back = html.includes('class="back"') ? {} : null;
    },
  });
  const dialog = elements['#sourceDialog'];
  dialog.open = false;
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; };
  const fetches = [];
  const timers = [];
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const math = Object.create(Math);
  math.random = () => random;
  const context = vm.createContext({
    Date: FixedDate, Intl, Math: math,
    Option: function (text, value) { this.text = text; this.value = value; },
    document: {
      querySelector: (selector) => selector === '.back' ? buttons.back : elements[selector],
      querySelectorAll: (selector) => selector === '.contributors' ? buttons.contributors : selector === '[data-source]' ? buttons.sources : [],
    },
    fetch: async (url, options) => { fetches.push({ url, options }); return { json: async () => data }; },
    setInterval: (...args) => { timers.push(args); },
    setTimeout: (...args) => { timers.push(args); },
  });
  vm.runInContext(app, context, { filename: 'app.js' });
  await new Promise(setImmediate);
  return { context, elements, buttons, fetches, timers, evaluate: (code) => vm.runInContext(code, context) };
}

test('deadlines use UTC+07 and distinguish before, exact deadline and after', async () => {
  const ui = await load();
  assert.equal(ui.evaluate("parseDue('05/11/2026 23:00')"), Date.parse('2026-11-05T16:00:00Z'));
  assert.equal(ui.evaluate("deadlineStatus('05/11/2026 23:00', Date.parse('2026-11-05T15:59:59Z'))"), 'trong hạn');
  assert.equal(ui.evaluate("deadlineStatus('05/11/2026 23:00', Date.parse('2026-11-05T16:00:00Z'))"), 'trong hạn');
  assert.equal(ui.evaluate("deadlineStatus('05/11/2026 23:00', Date.parse('2026-11-05T16:00:00.001Z'))"), 'đã qua hạn');
  assert.equal(ui.evaluate("parseDue('29/02/2028 00:00')"), Date.parse('2028-02-28T17:00:00Z'));
  for (const value of [undefined, null, '', 'unknown', '2026-11-05 23:00', '5/11/2026 23:00', '31/02/2026 23:00', '29/02/2026 23:00', '31/04/2026 23:00', '05/13/2026 23:00', '00/11/2026 23:00', '05/11/2026 24:00', '05/11/2026 23:60']) {
    ui.context.testDue = value;
    assert.equal(ui.evaluate('deadlineStatus(testDue)'), 'chưa rõ hạn', String(value));
  }
});

test('each load requests fresh data once and bumps the application asset version', async () => {
  const first = await load(fixture(), 0.25);
  const second = await load(fixture(), 0.75);
  assert.equal(first.fetches.length, 1);
  assert.equal(second.fetches.length, 1);
  assert.equal(first.fetches[0].options.cache, 'no-store');
  assert.equal(second.fetches[0].options.cache, 'no-store');
  assert.match(first.fetches[0].url, /^data\/weeks\.json\?v=.+/);
  assert.notEqual(first.fetches[0].url, second.fetches[0].url);
  assert.equal(first.timers.length, 0);
  assert.equal(second.timers.length, 0);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /app\.js\?v=fresh-deadline-20261106-1/);
  assert.doesNotMatch(html, /hourly-20261104-0715/);
});

test('newest tab defaults even when incomplete, without mutating the snapshot', async () => {
  const data = freeze(fixture());
  const before = JSON.stringify(data);
  const ui = await load(data);
  assert.equal(ui.elements['#week'].value, '20261105');
  assert.deepEqual(ui.elements['#week'].options.map((option) => option.value), ['20261105', '20261029', '20261022']);
  assert.match(ui.elements['#stats'].innerHTML, /hạn nộp · đã qua hạn/);
  assert.match(ui.elements['#week'].options[0].text, /đã qua hạn/);
  assert.doesNotMatch(ui.elements['#stats'].innerHTML + ui.elements['#week'].options[0].text, /đang thu/);
  assert.equal(JSON.stringify(data), before);
  ui.elements['#week'].value = '20261022';
  ui.elements['#week'].onchange();
  assert.equal(ui.evaluate('current.tab'), '20261022');
  assert.equal(ui.fetches.length, 1);
});

test('future and unknown due labels do not depend on completeness or review status', async () => {
  for (const [due, expected] of [['07/11/2026 23:00', 'trong hạn'], [undefined, 'chưa rõ hạn']]) {
    const data = fixture();
    data.weeks[0].due = due;
    data.weeks[0].complete = true;
    data.weeks[0].summaries[0].method = 'chatgpt-semantic-draft';
    const ui = await load(data);
    assert.ok(ui.elements['#stats'].innerHTML.includes(`hạn nộp · ${expected}`));
    assert.ok(ui.elements['#week'].options[0].text.endsWith(expected));
    assert.match(ui.elements.aside.textContent, /chưa hoàn tất/);
  }
});

test('reviewed snapshot wording uses group methods and the data timestamp', async () => {
  const ui = await load();
  const aside = ui.elements.aside.textContent;
  assert.match(aside, /06\/11\/2026/);
  assert.match(aside, /15:19/);
  assert.match(aside, /giờ Việt Nam/);
  assert.match(aside, /tổng hợp ngữ nghĩa/);
  assert.match(aside, /truy ngược được nguồn/);
  assert.match(aside, /không xác nhận mọi học viên đã nộp/);
  assert.doesNotMatch(aside, /đang thu|chưa hoàn tất/);
  assert.equal(ui.evaluate("snapshotTime('not-a-date')"), 'chưa rõ thời điểm cập nhật');
  for (const groups of [[], [{ id: 'journal', ideas: [] }], [{ method: 'chatgpt-semantic-reviewed', ideas: [] }, { method: 'chatgpt-semantic-draft', ideas: [] }]]) {
    const data = fixture();
    data.weeks[0].complete = true;
    data.weeks[0].summaries = groups;
    const draft = await load(data);
    assert.match(draft.elements.aside.textContent, /Phân tích và tổng hợp bản dữ liệu này chưa hoàn tất/);
    assert.doesNotMatch(draft.elements.aside.textContent, /đang thu|truy ngược được nguồn/);
  }
});

test('search retains idea indices and contributor/source/back/close/privacy behavior', async () => {
  const ui = await load();
  const { elements, buttons } = ui;
  for (const query of ['THỰC HÀNH', 'giữ <b>nhịp', 'bình', 'luyện viết mỗi ngày']) {
    elements['#search'].value = query;
    elements['#search'].oninput();
    assert.equal(buttons.contributors.length, 1, query);
    assert.equal(buttons.contributors[0].dataset.index, '1');
  }
  assert.match(elements['#groups'].innerHTML, /Thực hành &lt;an toàn&gt;/);
  assert.match(elements['#groups'].innerHTML, /2 tên học viên \+ 1 nguồn giữ riêng/);
  buttons.contributors[0].onclick();
  assert.equal(elements['#sourceDialog'].open, true);
  assert.deepEqual(buttons.sources.map((button) => button.dataset.source), ['an1', 'binh']);
  assert.doesNotMatch(elements['#detail'].innerHTML, /data-source="held"|data-source="an2"/);
  assert.match(elements['#detail'].innerHTML, /An &lt;A&gt;/);
  buttons.sources[0].onclick();
  assert.match(elements['#detail'].innerHTML, /Câu hỏi gốc/);
  assert.match(elements['#detail'].innerHTML, /Nhật ký &lt;gốc&gt;/);
  assert.match(elements['#detail'].innerHTML, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(elements['#detail'].innerHTML, /Tab 20261105 · hàng 3/);
  buttons.back.onclick();
  assert.deepEqual(buttons.sources.map((button) => button.dataset.source), ['an1', 'binh']);
  elements['.close'].onclick();
  assert.equal(elements['#sourceDialog'].open, false);
  buttons.contributors[0].onclick();
  elements['#sourceDialog'].onclick({ target: elements['#detail'] });
  assert.equal(elements['#sourceDialog'].open, true);
  elements['#sourceDialog'].onclick({ target: elements['#sourceDialog'] });
  assert.equal(elements['#sourceDialog'].open, false);
  elements['#search'].value = 'no matching answer';
  elements['#search'].oninput();
  assert.match(elements['#groups'].innerHTML, /Không tìm thấy kết quả phù hợp/);
  elements['#search'].value = '';
  elements['#search'].oninput();
  assert.equal(buttons.contributors.length, 2);
  assert.equal(ui.fetches.length, 1);
  assert.equal(ui.timers.length, 0);
});
