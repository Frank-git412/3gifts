import test from 'node:test';
import assert from 'node:assert/strict';
import {PILOT_EXPANSION_RULES,PILOT_CONTEXT_DECISIONS} from '../server/research/pilot-expansion.mjs';
import {pilotContextEvidence} from '../server/research/pilot-dictionary.mjs';
import {giftContext,contextPreference,contextualizeQueries} from '../server/research/gift-context.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {PUBLIC_RULES} from '../server/research/public-rules.mjs';
for(const r of PILOT_EXPANSION_RULES)test(r.id+' scope, missing/negative/contradictory evidence, queries',()=>{
 for(const value of r.values){
  const context=giftContext({ageRange:'adult',relation:r.signal==='relation'?value:null,occasion:r.signal==='occasion'?value:null});
  const effect=r.signal==='effect'?value:'any';
  const p={title:r.examples.it,tags:[r.area,r.subId],conceptFamily:r.area+':'+r.families[0]};
  for(const lang of ['it','en'])assert.equal(pilotContextEvidence({...p,title:r.examples[lang]},context,effect)[r.signal].status,'supported');
  assert.notEqual(pilotContextEvidence({...p,title:r.examples.negative},context,effect)[r.signal].status,'supported');
  assert.notEqual(pilotContextEvidence({...p,title:'Non '+p.title},context,effect)[r.signal].status,'supported');
  assert.notEqual(pilotContextEvidence({...p,features:'Not '+r.examples.en},context,effect)[r.signal].status,'supported');
  assert.notEqual(pilotContextEvidence({...p,conceptFamily:r.area+':unrelated'},context,effect)[r.signal].status,'supported');
  assert.equal(pilotContextEvidence({...p,tags:['unrelated']},context,effect),null);
  assert.notEqual(pilotContextEvidence({...p,title:'Prodotto',query:r.examples.it,searchKeywords:r.examples.it},context,effect)[r.signal].status,'supported');
  // A missing necessary property cannot get the same bonus.
  for(const pattern of r.properties){
   const missing=r.examples.it.replace(new RegExp(pattern.source,'ig'),'');
   assert.notEqual(pilotContextEvidence({...p,title:missing},context,effect)[r.signal].status,'supported',r.id+': '+pattern);
  }
  const q={id:'q',keywords:'base',area:r.area,associations:[{area:r.area,subId:r.subId,family:r.families[0]}]};
  const qs=contextualizeQueries([q],context,{effect});
  assert.ok(qs.some(q=>q.contextRule===r.id&&q.searchKeywords.includes(r.query)));assert.ok(qs.includes(q));
  const pref=contextPreference(p,context,effect);assert.equal(pref.eventPriorityScore,0);
  if(r.signal==='occasion'){
   assert.ok(pref.matches.includes('occasion'));
   assert.equal(pref.score,2,'A supported ordinary occasion gets a soft bonus, including a documented Advent calendar');
   assert.equal(contextPreference(p,giftContext({searchPriority:'personal',occasion:value}),effect).matches.includes('occasion'),false);
  }
 }
});
test('Every requested context has a rule or an explicit no-inference decision in each pilot',()=>{
 for(const area of ['culture','techGaming','styleBeauty']){
  for(const [signal,value] of [['relation','family'],['effect','surprising'],['effect','relax']])assert.ok(PILOT_EXPANSION_RULES.some(r=>r.area===area&&r.signal===signal&&r.values.includes(value)));
  for(const occasion of ['birthday','christmas','thanks','graduation','newhome','event'])assert.ok(PILOT_EXPANSION_RULES.some(r=>r.area===area&&r.signal==='occasion'&&r.values.includes(occasion))||PILOT_CONTEXT_DECISIONS.some(r=>r.area===area&&r.occasion===occasion));
 }
});
test('Skincare has no graduation/new-home bonus, even with advertising and generic gift boxes',()=>{
 for(const occasion of ['graduation','newhome']){
  const pref=contextPreference({title:'Crema viso cofanetto regalo laurea casa nuova',tags:['styleBeauty','skincare']},giftContext({occasion}),'any');
  assert.equal(pref.score,0);assert.equal(pref.matches.includes('occasion'),false);
 }
});
test('Surprise requires a colour display, not a colourful cover; ordinary events never outrank categories',()=>{
 const p={title:'Lettore ebook E Ink con custodia a colori',tags:['techGaming','tech'],conceptFamily:'techGaming:lettura_digitale'};
 assert.notEqual(pilotContextEvidence(p,giftContext({}),'surprising').effect.status,'supported');
 for(const occasion of ['birthday','christmas','thanks','graduation','newhome','event'])assert.equal(giftContext({occasion}).eventFirst,false);
});
const base={ageRange:'adult',minBudget:15,budget:100,recipientPreference:'unisex',relation:'family',occasion:'birthday',tone:'neutral',interests:['culture'],subinterests:['books']};
test('Relax aliases preserve polarity and supported skincare survives the public hard filter',()=>{
 for(const note of ['Relax','Rilassante','Per rilassarsi','Relaxing'])assert.ok(PUBLIC_RULES.analyseNote(note).signals.includes('calm'));
 assert.ok(PUBLIC_RULES.analyseNote('Niente relax').exclusions.includes('calm'));
 const ctx=publicPlan({profile:{...base,interests:['styleBeauty'],subinterests:['skincare']},constraints:PUBLIC_RULES.analyseNote('Relax')});
 assert.equal(new Set(ctx.plan.candidateQueries.map(q=>q.family)).size,20);
 const q=ctx.plan.queries.find(q=>q.contextRule==='skin-relax-massage');assert.ok(q);
 const p=publicCandidate({asin:'B000000001',title:'Crema corpo per massaggio nel rituale serale',features:'',price:30,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]},ctx);
 assert.ok(p);assert.ok(p.tags.includes('calm'));assert.equal(p.contextEvidence.effect.status,'supported');
});
test('Six/twelve budgets, mixed interests, rejected concepts and personal mode remain intact',()=>{
 const profile={...base,interests:['culture','techGaming'],subinterests:['books','tech'],tone:'surprising'};
 const ctx=publicPlan({profile});assert.equal(ctx.plan.queries.length,6);assert.ok(ctx.plan.fallbackQueries.length<=6);
 assert.equal(new Set(ctx.plan.queries.map(q=>q.area)).size,2);assert.ok(ctx.plan.queries.some(q=>!q.contextual));
 const personal=publicPlan({profile:{...profile,searchPriority:'personal'}});assert.ok(personal.plan.queries.every(q=>!q.id.endsWith('-occasion')));
 const rejected=publicPlan({profile,rejectedConcepts:['concept:techGaming:lettura_digitale']});
 assert.ok([...rejected.plan.queries,...rejected.plan.fallbackQueries].every(q=>q.family!=='lettura_digitale'));
});
test('All new rules have reachable public queries when declared compatibility permits them',()=>{
 for(const r of PILOT_EXPANSION_RULES){
  const profile={...base,interests:[r.area],subinterests:[r.subId],relation:r.signal==='relation'?r.values[0]:'family',occasion:r.signal==='occasion'?r.values[0]:'birthday',tone:r.signal==='effect'&&r.values[0]!=='relax'?r.values[0]:'neutral'};
  const constraints={...(r.values.includes('relax')?PUBLIC_RULES.analyseNote('Relax'):{}),recipientContext:{connections:['usb_a','usb_c','bluetooth']}};
  // Newer rules can share an effect. Restrict this coverage check to the rule's
  // family so it tests reachability, not an incidental default query order.
  const all=publicPlan({profile,constraints}).plan.candidateQueries;
  const rejectedConcepts=[...new Set(all.filter(q=>!r.families.includes(q.family)).map(q=>'concept:'+q.area+':'+q.family))];
  const ctx=publicPlan({profile,constraints,rejectedConcepts});
  const q=ctx.plan.queries.find(q=>q.contextRule===r.id);assert.ok(q,r.id+' query reachable');
  // Synthetic listing declares both its base type and the contextual properties.
  const listing={asin:'B000000001',title:q.keywords+'. '+r.examples.it,features:'USB A. USB C. Bluetooth.',price:30,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]};
  const candidate=publicCandidate(listing,ctx);assert.ok(candidate,r.id+' candidate survives hard filters');
  assert.equal(candidate.contextEvidence[r.signal].status,'supported',r.id+' public evidence');
 }
});
