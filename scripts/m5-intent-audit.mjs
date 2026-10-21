import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const [manifestPath,poolPath,baselinePath,candidatePath,outputPath]=process.argv.slice(2);
if(!outputPath||fs.existsSync(outputPath))throw Error('Provide manifest, pool, baseline, candidate and new output path');
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=read(manifestPath),pool=read(poolPath);assert.equal(pool.complete,true);
const digest=root=>hash(['app.js','recommendation-rules.js',...fs.readdirSync(path.join(root,'server/research')).filter(f=>f.endsWith('.mjs')).map(f=>'server/research/'+f)].sort().map(f=>f+':'+hash(fs.readFileSync(path.join(root,f)))).join('\n'));
const engines={};
for(const [name,root] of [['baseline',baselinePath],['candidate',candidatePath]]){
 const imp=f=>import(pathToFileURL(path.join(root,'server/research',f)).href);
 const require=createRequire(pathToFileURL(path.join(root,'tests/published-runtime.cjs')));
 engines[name]={...await imp('public-adapter.mjs'),...await imp('research-engine.mjs'),...await imp('engine.mjs'),runtime:require('./published-runtime.cjs').createRuntime('it'),sourceSha256:digest(root)};
}
const requestFor=(s,e)=>{const r=e.runtime;r.seed();r.set('interest',s.request.profile.interests);r.set('subinterest',s.request.profile.subinterests||[]);r.c.m5Profile=structuredClone(s.request.profile);return JSON.parse(JSON.stringify(r.eval('researchRequest(m5Profile,analyseNote(m5Profile.note||""))')));};
const querySummary=ctx=>[...ctx.plan.queries,...ctx.plan.fallbackQueries].map(q=>({id:q.id,keywords:q.keywords,searchKeywords:q.searchKeywords||q.keywords,area:q.area,subId:q.subId,family:q.family,eventTargeted:!!q.eventTargeted}));
const planChecks=manifest.scenarios.map(s=>{
 const a=engines.baseline.publicPlan(requestFor(s,engines.baseline)),b=engines.candidate.publicPlan(requestFor(s,engines.candidate));
 assert.equal(a.blocked,b.blocked);assert.deepEqual(a.profile,b.profile);assert.deepEqual(a.analysis,b.analysis);
 const before=querySummary(a),after=querySummary(b);assert.ok(after.length<=12);
 const changed=JSON.stringify(before)!==JSON.stringify(after);
 // Changes are expected for declared interests, relaxation and anniversary retrieval.
 return {id:s.id,changed,before,after,blocked:b.blocked};
});
const cases=[...manifest.scenarios.filter(s=>['L06','L12','T06','T12','S06','S12'].includes(s.id)),...read(path.join(candidatePath,'docs/m5-intent-new-cases.json')).scenarios];
const results=[];
for(const s of cases){
 const domain={Lettura:'books',Tecnologia:'technology',Skincare:'skincare',Misto:'books+skincare'}[s.category];
 const rows=[...new Map(pool.observations.filter(o=>domain.split('+').includes(o.domain)).flatMap(o=>{assert.equal(o.status,200);assert.ok(!o.partial);return o.data.searchResult.items.map(item=>[item.asin,{item,observedAt:o.observedAt}]);})).values()];
 const result={id:s.id,domain,rows:rows.length};
 for(const [name,e] of Object.entries(engines)){
  const run=()=>{
   const request=requestFor(s,e),ctx=e.publicPlan(request),queries=[...ctx.plan.queries,...ctx.plan.fallbackQueries];
   const merged=e.mergeCandidates(queries.map(q=>e.normalizeCandidates({searchResult:{items:rows.map(r=>r.item)}},q,ctx.plan.profile).map(p=>({...p,observedAt:rows.find(r=>r.item.asin===p.asin).observedAt}))));
   const eligible=merged.map(p=>e.publicCandidate(p,ctx)).filter(Boolean),selected=e.selectResearchIdeas(eligible,ctx.plan);
   for(const p of selected.products){assert.ok(p.price>=ctx.plan.profile.effectiveMin&&p.price<=ctx.plan.profile.max);assert.ok(p.areas.some(a=>ctx.plan.interests.includes(a)));}
   assert.equal(new Set(selected.products.map(p=>p.asin)).size,selected.products.length);
   return {request,queries:querySummary(ctx),products:selected.products,decisions:selected.finalSelection,eligible:eligible.length};
  };
  result[name]=run();assert.deepEqual(run(),result[name]);
 }
 results.push(result);console.log(JSON.stringify({id:s.id,before:result.baseline.products.map(p=>p.asin),after:result.candidate.products.map(p=>p.asin)}));
}
assert.equal(digest(candidatePath),engines.candidate.sourceSha256);
const output={createdAt:new Date().toISOString(),manifestSha256:hash(fs.readFileSync(manifestPath)),poolSha256:hash(fs.readFileSync(poolPath)),source:{baseline:engines.baseline.sourceSha256,candidate:engines.candidate.sourceSha256},summary:{planScenarios:planChecks.length,planChanges:planChecks.filter(p=>p.changed).map(p=>p.id),replayScenarios:results.length,repeated:true,realAmazonCalls:0,newHumanVotes:0,browserQA:false,retrieval:'same_frozen_pool_for_every_planned_query',selectionChanges:results.filter(r=>JSON.stringify(r.baseline.products.map(p=>p.asin))!==JSON.stringify(r.candidate.products.map(p=>p.asin))).map(r=>r.id)},planChecks,results};
fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output.summary));
