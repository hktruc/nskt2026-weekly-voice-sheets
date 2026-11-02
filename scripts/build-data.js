const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseCsv(text) {
  const rows=[]; let row=[], cell='', q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(q){ if(c==='"'&&n==='"'){cell+='"';i++;} else if(c==='"')q=false; else cell+=c; }
    else if(c==='"')q=true; else if(c===','){row.push(cell);cell='';}
    else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';} else cell+=c;
  }
  if(cell||row.length){row.push(cell);rows.push(row)}
  const h=rows.shift(); return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(h.map((x,i)=>[x,r[i]||''])));
}
const groups=[
  {id:'journal', title:'Nhật ký cảm xúc từ phản hồi đồng đội', oldCol:'Câu 2', newCol:'Câu 2', themes:[
    ['Biết ơn và cởi mở đón nhận góp ý',['biết ơn','cảm ơn','vui','đón nhận','ly nước rỗng']],
    ['Nhận diện cảm xúc và quan sát nội tâm',['quan sát','cảm xúc','hồi hộp','phán xét','tâm','bình thản']],
    ['Chưa nhận được phản hồi từ đồng đội',['chưa có nhận xét','chưa được nhận xét','chưa kịp','chưa chấm','gửi muộn']],
    ['Thấy điểm thiếu sót và có động lực sửa bài',['thiếu sót','sửa','làm lại','chỉn chu','cải thiện']]
  ]},
  {id:'change', title:'Chuyển hóa trong học tập và đời sống', oldCol:'Câu 3', newCol:'Câu 3', themes:[
    ['Tư duy đa chiều và hiểu vấn đề sâu hơn',['đa chiều','góc nhìn','nhìn sâu','hiểu sâu','khách quan']],
    ['Giao tiếp, kể chuyện rõ và tự tin hơn',['tự tin','hoạt ngôn','ngắn gọn','mạch lạc','lời nói','giao tiếp']],
    ['Đưa bài học vào ứng xử thực tế',['ứng dụng','đời sống','gia đình','công việc','hành vi','ứng xử']],
    ['Kiên trì thực hành và kaizen từng bước',['kaizen','nỗ lực','làm lại','rèn luyện','kiên trì','n lần']]
  ]},
  {id:'kaizen', title:'Điểm tự kaizen từ chấm bài đồng đội', oldCol:'Câu 4', newCol:'Câu 4', themes:[
    ['Chuẩn bị kỹ và làm bài sớm hơn',['chuẩn bị','làm sớm','chỉn chu','kỹ hơn','đọc sách']],
    ['Kể ngắn gọn, đúng trọng tâm',['ngắn','trọng tâm','dài','ý chính','cốt lõi']],
    ['Cải thiện giọng nói và sức cuốn hút',['giọng','trầm bổng','hấp dẫn','lôi cuốn','cảm xúc']],
    ['Phân tích, phản biện và đúc kết sâu hơn',['đa chiều','phản biện','đúc kết','sâu sắc','sắc bén']]
  ]},
  {id:'strength', title:'Điểm tốt của lớp cần phát huy', oldCol:'Câu 6', newCol:'Câu 5', themes:[
    ['Duy trì chia sẻ và học trực tiếp tại lớp',['chia sẻ','trực tiếp','offline','trình bày']],
    ['Phát huy sự đồng hành của mentor, đội nhóm',['mentor','đội nhóm','đồng đội','coach','kết nối']],
    ['Bài học và nền tảng hỗ trợ việc học',['bài học','web','xem lại','bài giảng','nộp bài']],
    ['Không khí hiểu thương và hỗ trợ nhau',['hiểu thương','thân hòa','nâng đỡ','hỗ trợ']]
  ]},
  {id:'improve', title:'Điểm lớp học cần cải thiện', oldCol:'Câu 7', newCol:'Câu 6', themes:[
    ['Tăng chất lượng chấm bài và phản hồi',['chấm','nhận xét','góp ý','phản hồi']],
    ['Giữ giờ học hợp lý và đúng cam kết',['đúng giờ','giờ','muộn','tan','9h','thời gian']],
    ['Tăng kết nối, động lực và mức tham gia',['kết nối','động lực','tương tác','xuống thuyền','tham gia']],
    ['Cải thiện cách tổ chức và nội dung học',['btc','vận hành','bài tập','bài giảng','tổ chức']]
  ]},
  {id:'action', title:'Hành động học viên cam kết đóng góp', oldCol:'Câu 8', newCol:'Câu 7', themes:[
    ['Tham gia đầy đủ, đúng giờ và làm gương',['đầy đủ','đúng giờ','làm gương','tuân thủ']],
    ['Chủ động chia sẻ và tương tác với đồng đội',['chia sẻ','tương tác','góc nhìn','nhắc nhở']],
    ['Nỗ lực hoàn thiện bản thân mỗi ngày',['nỗ lực','tốt lên','cải thiện','rèn luyện']],
    ['Nâng đỡ, kết nối và hỗ trợ đội nhóm',['nâng đỡ','hỗ trợ','kết nối','đồng đội']]
  ]},
  {id:'questions', title:'Khó khăn và câu hỏi gửi BTC/Thầy', oldCol:'Câu 9', newCol:'Câu 8', themes:[
    ['Khó sắp xếp thời gian và nguồn lực tham gia',['thời gian','bận','nguồn lực','con','công việc','offline']],
    ['Đề nghị điều chỉnh giờ và nhịp buổi học',['giờ','muộn','tan','9h','thời gian dạy']],
    ['Cần thêm hướng dẫn, thúc đẩy và phản hồi',['hướng dẫn','thúc đẩy','chấm','góp ý','phản hồi']],
    ['Hiện chưa có câu hỏi cụ thể',['chưa','không có','hiện tại thì chưa']]
  ]}
];
function parseQuestions(text){
  const out=[]; const re=/Câu\s+(\d+)\s*:\s*([\s\S]*?)(?=\n\s*Câu\s+\d+\s*:|$)/gi; let m;
  while((m=re.exec(text||'')))out.push({number:Number(m[1]),text:m[2].trim()});
  return out;
}
function routePrompt(text){
  const n=text.toLocaleLowerCase('vi');
  if(/làm tất cả câu chuyện|đúc kết công thức kể chuyện|hoàn thiện đúc kết công thức kể chuyện/.test(n))return 'excluded';
  const hits=[];
  if(/nhật ký|trạng thái tâm|cảm xúc/.test(n))hits.push('journal');
  if(/thay đổi|chuyển hoá|chuyển hóa/.test(n)&&/nhận thức|tư duy|hành vi|lời nói/.test(n))hits.push('change');
  if(/kaizen/.test(n)&&/bài làm|phản hồi|chấm/.test(n))hits.push('kaizen');
  if(/điểm tốt/.test(n)&&/phát huy/.test(n)&&/lớp học/.test(n))hits.push('strength');
  if(/điểm cần cải thiện/.test(n)&&/lớp học/.test(n))hits.push('improve');
  if(/hành động cụ thể/.test(n)&&/(đóng góp|lớp học tốt)/.test(n))hits.push('action');
  if(/khó khăn/.test(n)&&/(câu hỏi|btc|thầy)/.test(n))hits.push('questions');
  return hits.length===1?hits[0]:null;
}
const empty=/^(\.|-|chưa|chưa có|không|không có|\(chưa trả lời\)|sẽ quan sát thêm|sẽ suy nghĩ thêm|dạ chưa,? biết ơn ạ!?)[.!\s]*$/i;
function substantive(a){
  const n=a.toLocaleLowerCase('vi').replace(/\s+/g,' ').trim();
  if(!n||empty.test(n)||n.length<12)return false;
  return !/^(chưa có|hiện chưa|tôi sẽ|em sẽ) (góp ý|suy nghĩ|quan sát|trả lời)( thêm)?( sau)?[.!]*$/i.test(n);
}
function redactContacts(a){
  return a.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[đã ẩn email]').replace(/(?<!\d)0\d{9}(?!\d)/g,'[đã ẩn số điện thoại]');
}
const files=fs.readdirSync('.').filter(x=>/^2026\d{4}\.csv$/.test(x)).sort();
const weeks=[];
for(const file of files){
  const tab=path.basename(file,'.csv');
  const rows=parseCsv(fs.readFileSync(file,'utf8')).filter(r=>r['Loại bài']==='WEEK');
  const sources=[];
  const reviewQueue=[];
  rows.forEach((r,i)=>{
    const prompts=parseQuestions(r['Nội dung câu hỏi']||'');
    const routed=new Map();
    prompts.forEach(p=>{const group=routePrompt(p.text);if(group==='excluded')return;if(group&&!routed.has(group))routed.set(group,p);else if(group&&routed.get(group)?.text!==p.text)reviewQueue.push({row:i+2,reason:'duplicate-intent',questionNumber:p.number,prompt:p.text});});
    groups.forEach(g=>{
      const p=routed.get(g.id); if(!p)return;
      const col=`Câu ${p.number}`,a=redactContacts((r[col]||'').trim()); if(!substantive(a))return;
      const fingerprint=crypto.createHash('sha256').update([tab,r['Họ và tên'].trim(),g.id,a].join('\u001f')).digest('hex').slice(0,16);
      sources.push({id:`${tab}-${fingerprint}`,fingerprint,row:i+2,questionColumn:col,questionPrompt:p.text,group:g.id,name:r['Họ và tên'].trim(),answer:a,submitted:r['Nộp lúc']||'',due:r['Hạn nộp']||''});
    });
    prompts.filter(p=>!routePrompt(p.text)&&substantive(r[`Câu ${p.number}`]||'')).forEach(p=>reviewQueue.push({row:i+2,reason:'unclassified-question',questionNumber:p.number,prompt:p.text,name:r['Họ và tên'].trim(),answer:redactContacts(r[`Câu ${p.number}`])}));
  });
  const summaries=groups.map(g=>{
    const pool=sources.filter(s=>s.group===g.id);
    const used=new Set(); const ideas=[];
    for(const [label,keys] of g.themes){
      const hit=pool.filter(s=>keys.some(k=>s.answer.toLocaleLowerCase('vi').includes(k))).filter(s=>!used.has(s.id));
      if(hit.length>=2){hit.forEach(s=>used.add(s.id));ideas.push({title:label,count:hit.length,sourceIds:hit.map(s=>s.id)});}
    }
    const rest=pool.filter(s=>!used.has(s.id));
    if(rest.length)ideas.push({title:'Các nhu cầu và góc nhìn riêng cần được đọc nguyên văn',count:rest.length,sourceIds:rest.map(s=>s.id),unique:true});
    return {id:g.id,title:g.title,ideas};
  });
  weeks.push({tab,due:rows[0]?.['Hạn nộp']||'',submissionCount:rows.length,answerCount:sources.length,complete:rows.length>=20,reviewCount:reviewQueue.length,summaries,sources,reviewQueue});
}
fs.mkdirSync('data',{recursive:true});
fs.writeFileSync('data/weeks.json',JSON.stringify({generatedAt:new Date().toISOString(),sheetId:'1iDg5ryTjItafI9K0lwORi7KcwsCUmCClaQEg79KhWyQ',weeks},null,2));
console.log(weeks.map(w=>`${w.tab}: ${w.submissionCount} bài, ${w.answerCount} câu có nội dung`).join('\n'));
