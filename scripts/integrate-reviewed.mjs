import fs from 'node:fs';
import path from 'node:path';

const tabs=['20261022','20261029'];
const groups=['journal','change','kaizen','strength','improve','action','questions'];
const dataFile='data/weeks.json';
const data=JSON.parse(fs.readFileSync(dataFile,'utf8'));
const errors=[];

for(const tab of tabs){
  const week=data.weeks.find(w=>w.tab===tab);
  if(!week){errors.push(`${tab}: week missing`);continue}
  const sourceMap=new Map(week.sources.map(s=>[s.id,s]));
  for(const groupId of groups){
    const file=path.join('review-candidates',tab,`${groupId}.json`);
    if(!fs.existsSync(file)){errors.push(`${tab}/${groupId}: candidate file missing`);continue}
    const candidate=JSON.parse(fs.readFileSync(file,'utf8'));
    if(candidate.tab!==tab||candidate.group!==groupId)errors.push(`${tab}/${groupId}: identity mismatch`);
    if(!candidate.questionPrompt||!Array.isArray(candidate.ideas)||!candidate.ideas.length||candidate.ideas.length>10)errors.push(`${tab}/${groupId}: invalid question or idea count`);
    const groupSources=week.sources.filter(s=>s.group===groupId);
    const evidence=new Set();
    for(const [index,idea] of candidate.ideas.entries()){
      if(!idea.title||!idea.summary||!Array.isArray(idea.sourceIds)||!idea.sourceIds.length)errors.push(`${tab}/${groupId}/${index}: invalid idea`);
      for(const id of idea.sourceIds||[]){
        const source=sourceMap.get(id);
        if(!source||source.group!==groupId)errors.push(`${tab}/${groupId}/${index}: invalid source ${id}`);else evidence.add(id);
      }
      for(const id of idea.privacyReviewSourceIds||[])if(!(idea.sourceIds||[]).includes(id))errors.push(`${tab}/${groupId}/${index}: privacy id not in evidence ${id}`);
    }
    const reviewed=candidate.coverage?.reviewedSourceCount??candidate.coverage?.inputSourceCount;
    if(reviewed!==groupSources.length)errors.push(`${tab}/${groupId}: reviewed ${reviewed}, expected ${groupSources.length}`);
    if(Array.isArray(candidate.dispositions)){
      const disposed=new Set(candidate.dispositions.map(d=>d.sourceId));
      for(const source of groupSources)if(!disposed.has(source.id))errors.push(`${tab}/${groupId}: disposition missing ${source.id}`);
    }
    const summary=week.summaries.find(s=>s.id===groupId);
    if(!summary){errors.push(`${tab}/${groupId}: summary slot missing`);continue}
    summary.title=`Câu hỏi: ${candidate.questionPrompt}`;
    summary.ideas=candidate.ideas.map(idea=>({...idea,count:new Set(idea.sourceIds.map(id=>(sourceMap.get(id)?.name||id).trim().toLocaleLowerCase('vi').replace(/\s+/g,' '))).size}));
    summary.method='chatgpt-semantic-reviewed';
    summary.coverage=candidate.coverage;
    summary.provenance=candidate.provenance||{sourceHash:candidate.sourceHash,sourceHashMethod:candidate.sourceHashMethod,method:candidate.method};
    if(candidate.privacyReview)summary.privacyReview=candidate.privacyReview;
  }
}

if(errors.length){console.error(errors.join('\n'));process.exit(1)}
data.generatedAt=new Date().toISOString();
data.method='chatgpt-semantic-reviewed';
delete data.model;
const temporary=`${dataFile}.next`;
fs.writeFileSync(temporary,JSON.stringify(data,null,2)+'\n');
fs.renameSync(temporary,dataFile);
console.log(`Integrated ${tabs.length*groups.length} reviewed groups atomically.`);
