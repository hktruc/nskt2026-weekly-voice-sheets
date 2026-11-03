import fs from 'node:fs';
import crypto from 'node:crypto';
const data=JSON.parse(fs.readFileSync('data/weeks.json','utf8')),groups=['journal','change','kaizen','strength','improve','action','questions'],problems=[],strict=process.env.STRICT_REVIEWED==='1';
if(!Array.isArray(data.weeks))problems.push('weeks[] is missing');
for(const week of data.weeks||[]){
  const ids=new Set((week.sources||[]).map(s=>s.id));
  if(ids.size!==(week.sources||[]).length)problems.push(`${week.tab}: duplicate source id`);
  for(const group of week.summaries||[]){
    if(!groups.includes(group.id))problems.push(`${week.tab}: unknown group ${group.id}`);
    for(const idea of group.ideas||[]){
      if(!idea.title||!Array.isArray(idea.sourceIds)||!idea.sourceIds.length)problems.push(`${week.tab}/${group.id}: invalid idea`);
      for(const id of idea.sourceIds||[])if(!ids.has(id))problems.push(`${week.tab}/${group.id}: missing source ${id}`);
      for(const id of idea.privacyReviewSourceIds||[])if(!(idea.sourceIds||[]).includes(id))problems.push(`${week.tab}/${group.id}: privacy source is not evidence ${id}`);
      const evidenceSources=(idea.sourceIds||[]).map(id=>(week.sources||[]).find(s=>s.id===id)).filter(Boolean);
      const learners=new Set(evidenceSources.map(s=>s.name?.trim().toLocaleLowerCase('vi')).filter(Boolean));
      const heldCount=evidenceSources.filter(s=>s.privacyHeld).length;
      if((strict||group.method==='chatgpt-semantic-reviewed')&&idea.count!=null&&(idea.count<learners.size||idea.count>learners.size+heldCount))problems.push(`${week.tab}/${group.id}: count must conservatively include public learners and held sources`);
    }
  }
  for(const source of week.sources||[]){
    if(source.privacyHeld){
      if('name' in source||'answer' in source||'questionPrompt' in source||'row' in source||'submitted' in source)problems.push(`${week.tab}: held source exposes private fields ${source.id}`);
    }else if(!source.questionPrompt||!source.answer||!source.name)problems.push(`${week.tab}: incomplete source ${source.id}`);
    if(/@|\b0\d{9}\b/.test(`${source.answer} ${source.questionPrompt}`))problems.push(`${week.tab}: possible contact data in ${source.id}`);
  }
  if(strict&&['20261022','20261029'].includes(week.tab)){
    const found=new Set((week.summaries||[]).filter(s=>s.method==='chatgpt-semantic-reviewed').map(s=>s.id));
    for(const id of groups)if(!found.has(id))problems.push(`${week.tab}/${id}: reviewed bulletin missing`);
    for(const summary of week.summaries||[]){
      if(groups.includes(summary.id)&&((summary.ideas||[]).length<1||(summary.ideas||[]).length>10))problems.push(`${week.tab}/${summary.id}: expected 1-10 supported ideas`);
    }
  }
}
if(problems.length){console.error(problems.join('\n'));process.exit(1)}
const contentHash=crypto.createHash('sha256').update(JSON.stringify(data.weeks)).digest('hex');
console.log(JSON.stringify({ok:true,weeks:data.weeks.length,contentHash},null,2));
