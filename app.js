const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TITLES={journal:'Câu hỏi: Nhật ký cảm xúc từ phản hồi đồng đội',change:'Câu hỏi: Chuyển hóa trong học tập và đời sống',kaizen:'Câu hỏi: Điểm tự kaizen từ chấm bài đồng đội',strength:'Câu hỏi: Điểm tốt của lớp cần phát huy',improve:'Câu hỏi: Điểm lớp học cần cải thiện',action:'Câu hỏi: Hành động học viên cam kết đóng góp',questions:'Câu hỏi: Khó khăn và câu hỏi gửi BTC/Thầy'};
let model,current,sourceMap,activeIdea,activeGroup;
const personKey=s=>(s.name||'').trim().toLocaleLowerCase('vi').replace(/\s+/g,' ');
const privateIds=idea=>new Set(idea.privacyReviewSourceIds||[]);
function peopleFor(idea){const seen=new Set(),held=privateIds(idea);return (idea.sourceIds||[]).filter(id=>!held.has(id)).map(id=>sourceMap[id]).filter(s=>{if(!s)return false;const key=personKey(s);if(seen.has(key))return false;seen.add(key);return true})}
function countLabel(idea){const publicCount=peopleFor(idea).length,held=privateIds(idea).size;return `${publicCount} tên học viên${held?` + ${held} nguồn giữ riêng`:''}`}
fetch('data/weeks.json').then(r=>r.json()).then(d=>{model=d;const s=$('#week');d.weeks.slice().reverse().forEach(w=>s.add(new Option(`${w.tab} · ${w.submissionCount} bài${w.complete?'':' · đang thu'}`,w.tab)));const preferred=d.weeks.slice().reverse().find(w=>w.complete);if(preferred)s.value=preferred.tab;s.onchange=render;$('#search').oninput=render;render()}).catch(()=>$('#groups').innerHTML='<p class="empty">Không tải được dữ liệu.</p>');
function render(){
  current=model.weeks.find(w=>w.tab===$('#week').value)||model.weeks.at(-1);sourceMap=Object.fromEntries(current.sources.map(s=>[s.id,s]));
  const q=$('#search').value.trim().toLocaleLowerCase('vi');
  $('#stats').innerHTML=`<div class="stat"><b>${current.submissionCount}</b><span>bài WEEK${current.complete?'':' · đang thu bài'}</span></div><div class="stat"><b>${current.answerCount}</b><span>câu trả lời có nội dung</span></div><div class="stat"><b>${esc(current.due||current.tab)}</b><span>hạn nộp</span></div>`;
  $('#groups').innerHTML=current.summaries.map(g=>{
    const ideas=(g.ideas||[]).map((idea,index)=>({idea,index})).filter(({idea:i})=>!q||[i.title,i.summary,...i.sourceIds.map(id=>sourceMap[id]?.name),...i.sourceIds.map(id=>sourceMap[id]?.answer)].join(' ').toLocaleLowerCase('vi').includes(q));
    if(!ideas.length)return'';
    return `<section class="group"><h2>${esc(g.title||TITLES[g.id])}</h2><div class="ideas">${ideas.map(({idea:i,index},n)=>`<article class="idea"><span class="badge">Ý ${n+1} · ${countLabel(i)}</span><h3>${esc(i.title)}</h3>${i.summary?`<p>${esc(i.summary)}</p>`:''}<button class="contributors" data-group="${g.id}" data-index="${index}">Xem học viên đóng góp ý này</button></article>`).join('')}</div></section>`;
  }).join('')||'<p class="empty">Không tìm thấy kết quả phù hợp.</p>';
  document.querySelectorAll('.contributors').forEach(b=>b.onclick=()=>openContributors(b.dataset.group,+b.dataset.index));
}
function openContributors(groupId,index){
  activeGroup=current.summaries.find(g=>g.id===groupId);activeIdea=activeGroup.ideas[index];const people=peopleFor(activeIdea);
  const held=privateIds(activeIdea).size;
  $('#detail').innerHTML=`<span class="badge">${esc(activeGroup.title||TITLES[groupId])}</span><h2>${esc(activeIdea.title)}</h2>${activeIdea.summary?`<p>${esc(activeIdea.summary)}</p>`:''}<p class="meta">${people.length} tên học viên công khai hỗ trợ ý này. Tên trùng được gộp bảo thủ vì nguồn công khai không có mã học viên.${held?` ${held} nguồn có hoàn cảnh riêng được giữ lại trong thống kê nhưng không hiện tên/nguyên văn.`:''} Chọn tên để xem nguyên văn.</p><div class="people-list">${people.map(s=>`<button data-source="${s.id}">${esc(s.name)}</button>`).join('')}</div>`;
  document.querySelectorAll('[data-source]').forEach(b=>b.onclick=()=>openSource(sourceMap[b.dataset.source]));$('#sourceDialog').showModal();
}
function openSource(s){
  $('#detail').innerHTML=`<button class="back">← Danh sách học viên</button><span class="badge">${esc(s.questionColumn||s.group)}</span><h2>${esc(s.name)}</h2><h3>Câu hỏi gốc</h3><div class="answer">${esc(s.questionPrompt||TITLES[s.group])}</div><h3>Câu trả lời gốc</h3><div class="answer">${esc(s.answer)}</div><p class="meta">Tab ${esc(current.tab)} · hàng ${s.row} · hạn nộp ${esc(s.due||'không rõ')} · nộp lúc ${esc(s.submitted||'không rõ')} · mã ${esc(s.id)}</p>`;
  $('.back').onclick=()=>openContributors(activeGroup.id,activeGroup.ideas.indexOf(activeIdea));
}
$('.close').onclick=()=>$('#sourceDialog').close();$('#sourceDialog').onclick=e=>{if(e.target===$('#sourceDialog'))$('#sourceDialog').close()};
