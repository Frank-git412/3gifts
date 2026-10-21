import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
// Frozen-pool retrieval simulation. Each engine uses its shipped questionnaire
// serializer, not a hand-built approximation. No network or inherited votes.
const [manifestPath,poolPath,previousReplayPath,baselinePath,candidatePath,outPath,verifiedReplayPath]=process.argv.slice(2);
if(!outPath)throw Error('Usage: m5-context-replay.mjs MANIFEST POOL V129_REPLAY V129_SOURCE CANDIDATE OUTPUT');
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=read(manifestPath),pool=read(poolPath),prior=read(previousReplayPath);
assert.equal(hash(fs.readFileSync(manifestPath)),prior.protocol.manifestSha256);
assert.equal(hash(fs.readFileSync(poolPath)),prior.sourcePoolSha256);
assert.equal(pool.complete,true);
const scenarios=[...manifest.scenarios,...prior.results.filter(s=>s.group==='Supplementare')];
assert.equal(scenarios.length,122);
const pools={};
for(const o of pool.observations){
 assert.equal(o.status,200);assert.ok(!o.partial);
 const domain=pools[o.domain]||=new Map();
 for(const item of o.data.searchResult.items||[])if(!domain.has(item.asin))domain.set(item.asin,{item,observedAt:o.observedAt});
}
const sourceDigest=root=>{
 const files=['app.js','recommendation-rules.js','scripts/build-worker.mjs',...fs.readdirSync(path.join(root,'server/research')).filter(f=>f.endsWith('.mjs')).map(f=>'server/research/'+f)];
 return hash(files.sort().map(f=>f+':'+hash(fs.readFileSync(path.join(root,f)))).join('\n'));
};
const startingSource={v129:sourceDigest(baselinePath),candidate:sourceDigest(candidatePath)};
const verified=verifiedReplayPath?read(verifiedReplayPath):null;
if(verified){
 assert.equal(verified.manifestSha256,hash(fs.readFileSync(manifestPath)));
 assert.equal(verified.poolSha256,hash(fs.readFileSync(poolPath)));
 assert.equal(verified.source.v129,startingSource.v129);
 assert.equal(verified.results.length,122);
}
const engines={};
for(const [name,root] of [['v129',baselinePath],['candidate',candidatePath]]){
 const imp=f=>import(pathToFileURL(path.join(root,'server/research',f)).href);
 const require=createRequire(pathToFileURL(path.join(root,'tests/published-runtime.cjs')));
 const runtime=require('./published-runtime.cjs').createRuntime('it');
 engines[name]={...await imp('public-adapter.mjs'),...await imp('research-engine.mjs'),...await imp('engine.mjs'),...await imp('public-rules.mjs'),runtime};
}
function requestFor(s,e,wire){
 if(!wire)return {...structuredClone(s.request),constraints:e.PUBLIC_RULES.analyseNote(s.request.profile.note||'')};
 const r=e.runtime;r.seed();r.set('interest',s.request.profile.interests);r.set('subinterest',s.request.profile.subinterests||[]);
 r.c.m5Profile=structuredClone(s.request.profile);
 return JSON.parse(JSON.stringify(r.eval('researchRequest(m5Profile,analyseNote(m5Profile.note||""))')));
}
function replay(s,e,rows,wire){
 const request=requestFor(s,e,wire),ctx=e.publicPlan(request),queries=[...ctx.plan.queries,...ctx.plan.fallbackQueries];
 assert.ok(queries.length<=12);if(wire)assert.ok(!('note' in request.profile));
 const head={blocked:ctx.blocked,request,queries:queries.map(q=>({id:q.id,keywords:q.keywords,searchKeywords:q.searchKeywords,area:q.area,subId:q.subId,family:q.family,eventTargeted:!!q.eventTargeted,contextRule:q.contextRule}))};
 if(ctx.blocked||!queries.length)return {...head,products:[],decisions:[],basicViolations:[]};
 const normalization=[],merged=e.mergeCandidates(queries.map(q=>e.normalizeCandidates({searchResult:{items:rows.map(r=>r.item)}},q,ctx.plan.profile,normalization).map(p=>({...p,observedAt:rows.find(r=>r.item.asin===p.asin).observedAt}))));
 const decisions=rows.filter(r=>!merged.some(p=>p.asin===r.item.asin)).map(r=>({asin:r.item.asin,status:'rejected',reason:'normalization'}));
 const eligible=merged.flatMap(p=>{const reasons={},value=e.publicCandidate(p,{...ctx,allowAgeReview:true},reasons);if(!value)decisions.push({asin:p.asin,status:'rejected',reason:Object.keys(reasons)[0]});return value?[value]:[];});
 const selected=e.selectResearchIdeas(eligible,ctx.plan);decisions.push(...selected.finalSelection);
 assert.equal(new Set(decisions.map(d=>d.asin)).size,rows.length);
 const products=selected.products,basicViolations=[];
 for(const p of products){
  if(p.price<ctx.plan.profile.effectiveMin||p.price>ctx.plan.profile.max)basicViolations.push('budget:'+p.asin);
  if(!rows.some(r=>r.item.asin===p.asin))basicViolations.push('outside_pool:'+p.asin);
  if(!p.areas.some(a=>ctx.plan.interests.includes(a)))basicViolations.push('interest:'+p.asin);
 }
 if(new Set(products.map(p=>p.asin)).size!==products.length)basicViolations.push('duplicate_asin');
 for(let i=0;i<products.length;i++)for(let j=i+1;j<products.length;j++)if(products[i].parentAsin&&products[i].parentAsin===products[j].parentAsin)basicViolations.push('duplicate_parent');
 assert.ok(products.length<=3);assert.deepEqual(basicViolations,[]);
 return {...head,products,decisions,basicViolations};
}
const results=scenarios.map(s=>{
 console.log('Replay '+s.id);
 const domains=s.id.startsWith('C25')?['children']:s.id.startsWith('A01')?['books','skincare']:[{Lettura:'books',Tecnologia:'technology',Skincare:'skincare'}[s.category]];
 const rows=[...new Map(domains.flatMap(d=>[...pools[d].entries()])).values()];
 const result={id:s.id,category:s.category,group:s.group,poolHash:hash(JSON.stringify(rows))};
 // Reproduce the previous v129 selection first, isolating protocol differences.
 const cached=verified?.results.find(r=>r.id===s.id),old=prior.results.find(r=>r.id===s.id);
 if(cached){
  assert.equal(cached.poolHash,result.poolHash);
  assert.deepEqual(cached.legacyV129,old.candidate.products.map(p=>p.asin));
  result.legacyV129=cached.legacyV129;result.v129=cached.v129;
 }else{
  const legacy=replay(s,engines.v129,rows,false);
  assert.deepEqual(legacy.products.map(p=>p.asin),old.candidate.products.map(p=>p.asin),'Legacy v129 mismatch '+s.id);
  result.legacyV129=legacy.products.map(p=>p.asin);
 }
 for(const [name,e] of Object.entries(engines)){
  if(name==='v129'&&cached)continue;
  result[name]=replay(s,e,rows,true);assert.deepEqual(replay(s,e,rows,true),result[name]);
 }
 return result;
});
const summary={scenarios:122,mainScenarios:120,realAmazonCalls:0,newHumanVotes:0,browserQA:false,requestSerialization:'actual_shipped_questionnaire_vm',retrieval:'same_frozen_pool_for_every_planned_query',byEngine:{}};
for(const name of ['v129','candidate']){
 const main=results.filter(r=>r.group!=='Supplementare');
 summary.byEngine[name]={coverage:Object.fromEntries([0,1,2,3].map(n=>[n,main.filter(r=>r[name].products.length===n).length])),proposals:main.reduce((n,r)=>n+r[name].products.length,0),basicViolations:main.flatMap(r=>r[name].basicViolations),blocked:main.filter(r=>r[name].blocked).map(r=>r.id)};
}
summary.serializationChanges=results.filter(r=>JSON.stringify(r.legacyV129)!==JSON.stringify(r.v129.products.map(p=>p.asin))).map(r=>r.id);
summary.selectionChanges=results.filter(r=>JSON.stringify(r.v129.products.map(p=>p.asin))!==JSON.stringify(r.candidate.products.map(p=>p.asin))).map(r=>r.id);
assert.equal(sourceDigest(candidatePath),startingSource.candidate,'Source changed during replay');
assert.equal(sourceDigest(baselinePath),startingSource.v129);
const output={createdAt:new Date().toISOString(),manifestSha256:hash(fs.readFileSync(manifestPath)),poolSha256:hash(fs.readFileSync(poolPath)),baselineValidation:verified?{mode:'reused_verified_baseline',sourceFileSha256:hash(fs.readFileSync(verifiedReplayPath))}:{mode:'reproduced_in_this_run'},source:{...startingSource,candidateHead:execFileSync('git',['-C',candidatePath,'rev-parse','HEAD'],{encoding:'utf8'}).trim()},summary,results};
fs.writeFileSync(outPath,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
