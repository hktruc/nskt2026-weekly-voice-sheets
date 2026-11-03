import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ACCOUNT=process.env.CLOUDFLARE_ACCOUNT_ID,TOKEN=process.env.CLOUDFLARE_API_TOKEN;
const MODEL=process.env.WORKERS_AI_MODEL||'@cf/meta/llama-3.2-3b-instruct';
const TAB=process.env.TARGET_TAB||'20261029',GROUP=process.env.TARGET_GROUP||'journal';
const VERSION='question-ideas-v2',CHUNK=Number(process.env.CHUNK_SIZE||12);
const DATA='data/weeks.json',STATUS='data/status.json',ROOT='data/ai-cache';
const attemptedAt=new Date().toISOString();
const sha=x=>crypto.createHash('sha256').update(x).digest('hex').slice(0,20);
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
function write(f,v){fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n')}
function validate(value,allowed){
  if(!value||!Array.isArray(value.ideas))throw Error('AI response lacks ideas[]');
  return value.ideas.map((x,i)=>{if(!x||typeof x.title!=='string'||typeof x.summary!=='string')throw Error(`Invalid idea ${i}`);
    const sourceIds=[...new Set(Array.isArray(x.sourceIds)?x.sourceIds:[])].filter(id=>allowed.has(id));
    if(!sourceIds.length)throw Error(`Idea ${i} has no valid source`);
    return{title:x.title.trim(),summary:x.summary.trim(),sourceIds,unique:Boolean(x.unique),conflict:Boolean(x.conflict)};
  });
}
async function ai(messages,max_tokens){
  if(!ACCOUNT||!TOKEN)throw Error('Missing Cloudflare Actions secrets');
  const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${MODEL}`,{method:'POST',headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({messages,response_format:{type:'json_object'},max_tokens,temperature:0})});
  const j=await r.json();if(!r.ok||!j.success)throw Error(`Workers AI ${r.status}: ${JSON.stringify(j.errors||j).slice(0,500)}`);
  const raw=j.result?.response??j.result,value=typeof raw==='string'?JSON.parse(raw.replace(/^```json|```$/g,'').trim()):raw;
  return{value,usage:j.result?.usage||null};
}
function status(previous,patch){write(STATUS,{...previous,attemptedAt,target:{tab:TAB,group:GROUP},model:MODEL,promptVersion:VERSION,...patch})}

const payload=read(DATA),previous=fs.existsSync(STATUS)?read(STATUS):{};
const week=payload.weeks.find(w=>w.tab===TAB);if(!week)throw Error(`Unknown target tab ${TAB}`);
const sources=week.sources.filter(s=>s.group===GROUP);if(!sources.length)throw Error(`No sources for ${TAB}/${GROUP}`);
const key=sha(JSON.stringify({version:VERSION,model:MODEL,tab:TAB,group:GROUP,sources:sources.map(({id,answer,questionPrompt})=>({id,answer,questionPrompt}))}));
const dir=path.join(ROOT,TAB,GROUP,key),manifestFile=path.join(dir,'manifest.json');
const chunks=[];for(let i=0;i<sources.length;i+=CHUNK)chunks.push(sources.slice(i,i+CHUNK));
let manifest=fs.existsSync(manifestFile)?read(manifestFile):{state:'pending',tab:TAB,group:GROUP,model:MODEL,promptVersion:VERSION,sourceHash:key,sourceCount:sources.length,completedChunks:[],createdAt:attemptedAt};
write(manifestFile,manifest);status(previous,{status:'running',sourceCount:sources.length,chunkCount:chunks.length,completedChunks:manifest.completedChunks.length,preservedPreviousSnapshot:true});

try{
  for(let i=0;i<chunks.length;i++){
    const file=path.join(dir,`chunk-${String(i+1).padStart(2,'0')}.json`);if(fs.existsSync(file))continue;
    const chunk=chunks[i];console.log(`checkpoint ${TAB}/${GROUP} ${i+1}/${chunks.length}; ${chunk.length} sources`);
    const result=await ai([{role:'system',content:'Tổng hợp trung thực phản hồi học viên bằng tiếng Việt. Chỉ dùng sourceId đã cho. Không suy diễn đồng thuận, không bịa nguồn. JSON {"ideas":[{"title":"...","summary":"...","sourceIds":["..."],"unique":false,"conflict":false}]}.'},{role:'user',content:`Câu hỏi BTC: ${chunk[0]?.questionPrompt||GROUP}\nRút ý từ lô này. Nhu cầu hiếm cần hỗ trợ có thể unique=true. ${JSON.stringify(chunk.map(({id,answer})=>({sourceId:id,answer})))}`}],1200);
    const ideas=validate(result.value,new Set(chunk.map(s=>s.id)));write(file,{index:i,sourceIds:chunk.map(s=>s.id),ideas,usage:result.usage});
    manifest.completedChunks=[...new Set([...manifest.completedChunks,i])].sort((a,b)=>a-b);manifest.updatedAt=new Date().toISOString();write(manifestFile,manifest);
    status(previous,{status:'partial',sourceCount:sources.length,chunkCount:chunks.length,completedChunks:manifest.completedChunks.length,preservedPreviousSnapshot:true});
  }
  const chunkIdeas=chunks.flatMap((_,i)=>read(path.join(dir,`chunk-${String(i+1).padStart(2,'0')}.json`)).ideas);
  console.log(`final merge ${TAB}/${GROUP}; ${chunkIdeas.length} checkpoint ideas`);
  const merged=await ai([{role:'system',content:'Hợp nhất ngữ nghĩa bằng tiếng Việt thành khoảng 5-10 ý chính nếu đủ bằng chứng; không ép số lượng, không tạo sourceId, giữ nhu cầu hiếm và quan điểm trái chiều. JSON {"ideas":[{"title":"...","summary":"...","sourceIds":["..."],"unique":false,"conflict":false}]}.'},{role:'user',content:JSON.stringify(chunkIdeas)}],1800);
  const finalIdeas=validate(merged.value,new Set(sources.map(s=>s.id)));write(path.join(dir,'final.json'),{ideas:finalIdeas,usage:merged.usage,completedAt:new Date().toISOString()});
  manifest={...manifest,state:'complete',ideaCount:finalIdeas.length,completedAt:new Date().toISOString()};write(manifestFile,manifest);
  const summary=week.summaries.find(x=>x.id===GROUP);if(!summary)throw Error(`Missing summary ${GROUP}`);
  Object.assign(summary,{ideas:finalIdeas,method:'workers-ai-semantic',model:MODEL,sourceHash:key});payload.generatedAt=new Date().toISOString();payload.method='workers-ai-semantic-incremental';payload.model=MODEL;write(DATA,payload);
  status(previous,{status:'partial-success',lastSuccessfulAt:payload.generatedAt,completedGroups:[{tab:TAB,group:GROUP,sourceHash:key,ideaCount:finalIdeas.length}],preservedPreviousSnapshot:false});
}catch(error){manifest={...manifest,state:'partial',updatedAt:new Date().toISOString(),error:String(error.message).slice(0,500)};write(manifestFile,manifest);status(previous,{status:'failed',error:String(error.message).slice(0,500),sourceCount:sources.length,chunkCount:chunks.length,completedChunks:manifest.completedChunks.length,preservedPreviousSnapshot:true});console.error(error);process.exitCode=2;}
