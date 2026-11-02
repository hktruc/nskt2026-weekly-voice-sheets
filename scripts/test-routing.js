const assert=require('assert');
function route(t){const n=t.toLocaleLowerCase('vi'),h=[];if(/làm tất cả câu chuyện|đúc kết công thức kể chuyện|hoàn thiện đúc kết công thức kể chuyện/.test(n))return'excluded';if(/nhật ký|trạng thái tâm|cảm xúc/.test(n))h.push('journal');if(/thay đổi|chuyển hoá|chuyển hóa/.test(n)&&/nhận thức|tư duy|hành vi|lời nói/.test(n))h.push('change');if(/kaizen/.test(n)&&/bài làm|phản hồi|chấm/.test(n))h.push('kaizen');if(/điểm tốt/.test(n)&&/phát huy/.test(n)&&/lớp học/.test(n))h.push('strength');if(/điểm cần cải thiện/.test(n)&&/lớp học/.test(n))h.push('improve');if(/hành động cụ thể/.test(n)&&/(đóng góp|lớp học tốt)/.test(n))h.push('action');if(/khó khăn/.test(n)&&/(câu hỏi|btc|thầy)/.test(n))h.push('questions');return h.length===1?h[0]:null}
const prompts={journal:'Viết Nhật ký đúc kết trạng thái tâm, cảm xúc',change:'Chia sẻ sự thay đổi, chuyển hóa về nhận thức, tư duy, hành vi và lời nói',kaizen:'Từ phản hồi & chấm bài, 3 điểm cần kaizen cho bài làm',strength:'01 điểm tốt cần phát huy trong lớp học',improve:'03 điểm cần cải thiện trong lớp học',action:'Hành động cụ thể của bạn đóng góp giúp lớp học tốt lên',questions:'Bạn có khó khăn & câu hỏi gì đến BTC/Thầy?'};
for(const [k,v] of Object.entries(prompts))assert.equal(route(v),k);
for(const v of Object.values(prompts).reverse())assert.ok(route(v)); // thứ tự bất kỳ
assert.equal(route('Câu hỏi mới hoàn toàn chưa biết ý định'),null); // thêm câu mới vào hàng chờ
assert.equal(route('Đúc kết công thức kể chuyện hay'),'excluded'); // câu bị bỏ không làm dịch nhóm
console.log('routing fixtures: ok');
