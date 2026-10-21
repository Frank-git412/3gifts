import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_RULES as rules} from '../server/research/public-rules.mjs';
import {publicPlan,publicCandidate,publicRecommendation} from '../server/research/public-adapter.mjs';
import {selectResearchIdeas} from '../server/research/research-engine.mjs';
import {weightedRanking} from '../server/research/weighted-ranking.mjs';
import {normalizeCandidates} from '../server/research/engine.mjs';
import {database} from './d1-fixture.mjs';
const profile={ageRange:'adult',interests:['culture','styleBeauty'],subinterests:['books','skincare'],budget:60,minBudget:15};
for(const note of ['Gli piacciono i libri','He likes books','Ama i libri','Non solo libri','Not only books'])test('Preference does not remove a second selected interest: '+note,()=>{
 const a=rules.analyseNote(note),ctx=publicPlan({profile,constraints:a});
 assert.ok(a.signals.includes('books'));assert.deepEqual(a.requiredSignals,[]);assert.equal(ctx.plan.ranking.active.note,true);
 assert.equal(rules.interestEligible({tags:['styleBeauty','skincare']},profile,a),true);
 assert.ok(ctx.plan.queries.some(q=>q.area==='styleBeauty'));assert.ok(a.noteConstraints.some(x=>x.type==='preference'&&x.value==='books'));
});
for(const note of ['Solo libri','Books only','Only books','I libri sono obbligatori','Books are mandatory','Ama solo libri','Solo libri cartacei','Only paper books'])test('Explicit obligation stays a filter with no double bonus: '+note,()=>{
 const a=rules.analyseNote(note),ctx=publicPlan({profile,constraints:a});
 assert.ok(a.requiredSignals.includes('books'));assert.equal(ctx.plan.ranking.active.note,false);
 assert.equal(rules.interestEligible({tags:['styleBeauty','skincare']},profile,a),false);
});
for(const note of ['Cerco libri','I want books','I am looking for books'])test('Specific request is distinct from a preference: '+note,()=>{
 const a=rules.analyseNote(note);assert.ok(a.requiredSignals.includes('books'));assert.ok(a.noteConstraints.some(x=>x.type==='request'&&x.value==='books'));
});
for(const note of ['Non ama i romanzi, solo romanzi','Does not like novels, only novels','Niente libri. Solo libri.'])test('Contradiction requires review: '+note,()=>{
 const a=rules.analyseNote(note);assert.equal(a.needsClarification,true);assert.equal(publicPlan({profile,constraints:a}).blocked,true);
});
for(const note of ['Non so se preferisce tè o caffè','I do not know whether she prefers tea or coffee',"I'm not sure if he likes books"])test('Unknown taste creates neither a bonus nor a ban: '+note,()=>{
 const a=rules.analyseNote(note);assert.deepEqual(a.signals,[]);assert.deepEqual(a.exclusions,[]);assert.equal(a.needsClarification,false);assert.ok(a.noteConstraints.some(x=>x.type==='uncertain'));
});
for(const note of ['Ama i thriller, niente horror','Likes thrillers, no horror'])test('Preference and exclusion survive in the same note: '+note,()=>{
 const a=rules.analyseNote(note);assert.equal(a.needsClarification,false);assert.ok(a.exclusions.includes('horror'));assert.ok(a.signals.includes('thriller'));
 const ctx=publicPlan({profile,constraints:a});const rank=p=>weightedRanking(p,[{score:1}],ctx.plan.ranking);
 assert.equal(rank({title:'Romanzo thriller'}).signals.note.value,1);assert.equal(rank({title:'Romanzo storico'}).signals.note.value,0);
 assert.equal(rules.violatesExclusions({title:'Romanzo horror',tags:['culture','books']},profile,a),true);
});
for(const note of ['Ama un romanzo sulla natura','Likes a novel about nature'])test('M3 optional property needs listing evidence but does not prune alternatives: '+note,()=>{
 const a=rules.analyseNote(note),ctx=publicPlan({profile,constraints:a});assert.deepEqual(a.specificIntents,[]);assert.deepEqual(a.optionalIntents,['m3:K003']);assert.equal(ctx.blocked,false);
 const q=[...ctx.plan.queries,...ctx.plan.fallbackQueries].find(q=>q.optionalTermId==='m3:K003');assert.ok(q);
 const make=(title)=>publicCandidate({asin:'B000000001',title,features:title,price:30,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]},ctx);
 const yes=make('Romanzo sulla natura'),no=make('Romanzo storico');assert.ok(yes);assert.ok(no);
 assert.equal(weightedRanking(yes,[{score:1}],ctx.plan.ranking).signals.note.value,1);
 assert.equal(weightedRanking(no,[{score:1}],ctx.plan.ranking).signals.note.value,0);
});
test('Specific M3 request and safety/property filters retain their established behavior',()=>{
 assert.deepEqual(rules.analyseNote('Cerco un romanzo sulla natura').specificIntents,['m3:K003']);
 const a=rules.analyseNote('Crema senza profumazione');assert.ok(a.exclusions.includes('fragranceFree'));
 assert.equal(rules.violatesExclusions({title:'Crema viso',tags:['styleBeauty','skincare']},profile,a),true);
 assert.equal(rules.analyseNote('Allergia alle noci').needsClarification,true);
});
test('An optional category never expands selected interests',()=>{
 const ctx=publicPlan({profile:{...profile,interests:['styleBeauty'],subinterests:['skincare']},constraints:rules.analyseNote('Ama i libri')});
 assert.ok([...ctx.plan.queries,...ctx.plan.fallbackQueries].every(q=>q.area==='styleBeauty'));
});
test('Uncertainty never swallows a restriction; postposed M3 obligation stays mandatory',()=>{
 for(const note of ['Non so se ama libri e niente profumo','Not sure if he likes books without perfume'])assert.equal(rules.analyseNote(note).needsClarification,true);
 assert.deepEqual(rules.analyseNote('Likes a novel about nature only').specificIntents,['m3:K003']);
 const a=rules.analyseNote('Non so se ama libri. Niente horror.');assert.ok(a.exclusions.includes('horror'));assert.equal(a.needsClarification,false);
});
test('Coverage lookahead avoids a parent-variant trap, independently of input order',()=>{
 const ctx=publicPlan({profile}),qs=[...ctx.plan.queries,...ctx.plan.fallbackQueries],b=qs.find(q=>q.area==='culture'),s=qs.find(q=>q.area==='styleBeauty');
 const p=(asin,q,parentAsin)=>({asin,title:q.keywords,features:q.keywords,price:30,researchQueryIds:[q.id],parentAsin});
 const a=p('B000000001',b,'B000000099'),alternative=p('B000000002',b,'B000000098'),skin=p('B000000003',s,'B000000099');
 for(const rows of [[a,alternative,skin],[skin,alternative,a]]){
  const result=selectResearchIdeas(rows,ctx.plan);assert.deepEqual(result.missing,[]);assert.ok(result.products.some(p=>p.asin===alternative.asin));assert.ok(result.products.some(p=>p.asin===skin.asin));
 }
});
test('Every raw row has a normalization decision, including repeated ASIN observations',()=>{
 const item={asin:'B000000001',detailPageURL:'https://www.amazon.it/dp/B000000001',itemInfo:{title:{displayValue:'Libro'},features:{displayValues:[]}},offersV2:{listings:[{price:{money:{amount:30,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}};
 const rows=[item,{...item,asin:'wrong'},{...item,itemInfo:{}},{...item,detailPageURL:'http://evil.example/'},{...item,offersV2:{listings:[]}},item];
 const diag=[],out=normalizeCandidates({searchResult:{items:rows}},{id:'q1',area:'culture',keywords:'libro',keywordId:'x'},{age:'adult',exclude:[],effectiveMin:15,max:60,sex:'any'},diag);
 assert.equal(out.length,2);assert.equal(diag.length,6);assert.deepEqual(diag.map(x=>x.reason),['eligible_offer_and_listing','invalid_asin','missing_title','invalid_marketplace_url','no_eligible_offer','eligible_offer_and_listing']);assert.deepEqual(diag.map(x=>x.rowIndex),[0,1,2,3,4,5]);
});
const req=()=>new Request('https://3gifts.it/api/amazon/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify({profile})});
const envFor=(binding,id)=>({DB:binding,AMAZON_CREATORS_VERSION:'3.2',AMAZON_CREATORS_CLIENT_ID:id,AMAZON_CREATORS_CLIENT_SECRET:'fixture',AMAZON_PARTNER_TAG:'fixture-21'});
test('Four active searches coalesce; fifth is busy; upstream stop releases capacity',async()=>{
 const {db,binding}=database(),env=envFor(binding,'m4-concurrency'),original=globalThis.fetch;let release,started,calls=0;
 const began=new Promise(r=>started=r),hold=new Promise(r=>release=r);
 globalThis.fetch=async url=>{if(url.includes('/auth/'))return Response.json({access_token:'fixture'});calls++;started();await hold;return Response.json({retryAfterSeconds:1},{status:429});};
 try{
  const pending=Array.from({length:4},()=>publicRecommendation(req(),env));await began;
  const busy=await publicRecommendation(req(),env);assert.equal(busy.status,429);assert.equal((await busy.json()).code,'SearchBusy');release();
  const finished=await Promise.all(pending);for(const response of finished){const body=await response.json();assert.equal(body.efficiency.stopReason,'upstream_error');assert.ok(body.diagnostics.failureReasons.includes('upstream_429'));}
  assert.equal(calls,1);assert.notEqual((await (await publicRecommendation(req(),env)).json()).code,'SearchBusy');
 }finally{release?.();globalThis.fetch=original;db.close();}
});
test('75-second deadline stops after current response and preserves raw-row accounting',async()=>{
 const {db,binding}=database(),env=envFor(binding,'m4-deadline'),originalFetch=globalThis.fetch,originalNow=Date.now;let clock=originalNow(),calls=0;
 Date.now=()=>clock;
 globalThis.fetch=async url=>{if(url.includes('/auth/'))return Response.json({access_token:'fixture'});calls++;clock+=75000;return Response.json({searchResult:{items:[{asin:'bad'}]}});};
 try{const body=await(await publicRecommendation(req(),env)).json();assert.equal(calls,1);assert.equal(body.efficiency.stopReason,'deadline');assert.equal(body.partial,true);assert.equal(body.diagnostics.durationMs,75000);assert.equal(body.diagnostics.receivedRows,1);assert.equal(body.diagnostics.normalization.length,1);assert.equal(body.diagnostics.normalizedRows,0);}
 finally{Date.now=originalNow;globalThis.fetch=originalFetch;db.close();}
});
