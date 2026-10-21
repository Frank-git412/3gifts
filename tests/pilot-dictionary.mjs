import test from 'node:test';
import assert from 'node:assert/strict';
import {PILOT_DICTIONARY_RULES,pilotContextEvidence,pilotDictionaryInventory} from '../server/research/pilot-dictionary.mjs';
import {giftContext,contextPreference} from '../server/research/gift-context.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {chooseCandidate} from '../server/research/reviews.mjs';

for(const rule of PILOT_DICTIONARY_RULES)test(rule.id+' IT/EN listing evidence and generic negative',()=>{
 const context=giftContext({ageRange:'adult',relation:rule.signal==='relation'?rule.values[0]:'family',occasion:rule.signal==='occasion'?rule.values[0]:'event'});
 const effect=rule.signal==='effect'?rule.values[0]:'any';
 for(const lang of ['it','en']){
  const p={asin:'B000000001',title:rule.examples[lang],tags:[rule.area,rule.subId]};
  const result=pilotContextEvidence(p,context,effect)[rule.signal];
  assert.equal(result.status,'supported');assert.equal(result.rule,rule.id);
  assert.ok(result.evidence.every(e=>e.field==='title'&&e.asin===p.asin));
  assert.ok(contextPreference(p,context,effect).matches.includes(rule.signal==='relation'?'recipient':rule.signal));
 }
 const negative={title:rule.examples.negative,tags:[rule.area,rule.subId]};
 assert.notEqual(pilotContextEvidence(negative,context,effect)[rule.signal].status,'supported');
});
test('Negation, missing details and query-only claims never support a bonus',()=>{
 const tags=['culture','books'],context=giftContext({relation:'friend'});
 const absent=pilotContextEvidence({title:'Romanzo',features:'',query:'romanzo umoristico amicizia',searchKeywords:'umoristico',tags},context,'funny');
 assert.equal(absent.relation.status,'absent');assert.equal(absent.effect.status,'absent');
 for(const title of ['Romanzo non umoristico','Novel with no humorous content'])assert.equal(pilotContextEvidence({title,tags},context,'funny').effect.status,'contradictory');
 const partial=pilotContextEvidence({title:'Lampada lettura',features:'',tags},context,'useful');
 assert.equal(partial.effect.status,'partial');
 const conflict=pilotContextEvidence({title:'Lampada lettura regolabile',features:'La luminosità non è regolabile.',tags},context,'useful');
 assert.equal(conflict.effect.status,'contradictory');
});
test('Wrong family, unrelated category and absent relationship do not get a context bonus',()=>{
 const context=giftContext({relation:'friend'});
 assert.equal(pilotContextEvidence({title:'Tazza con una citazione del romanzo umoristico',tags:['home','decor']},context,'funny'),null);
 assert.equal(contextPreference({title:'Siero antirughe elegante per donna amica',tags:['styleBeauty','skincare']},context,'elegant').matches.includes('effect'),false);
 const plain={title:'Romanzo romantico',tags:['culture','books']};
 assert.equal(contextPreference(plain,giftContext({relation:'partner'}),'sentimental').matches.length,0);
});
test('The same candidates change order for the declared effect with evidence kept in public output',()=>{
 const profile={ageRange:'adult',relation:'friend',occasion:'birthday',interests:['culture'],subinterests:['books'],tone:'funny',budget:60,minBudget:15,recipientPreference:'unisex'};
 const ctx=publicPlan({profile});const q=[...ctx.plan.queries,...ctx.plan.fallbackQueries].find(q=>/romanzo/.test(q.keywords));assert.ok(q);
 const base={price:30,url:'https://www.amazon.it/dp/B000000001?tag=3gifts-21',researchQueryIds:[q.id],features:''};
 const normal=publicCandidate({...base,asin:'B000000001',title:q.keywords},ctx);
 const humorous=publicCandidate({...base,asin:'B000000002',title:q.keywords+' umoristico'},ctx);
 assert.ok(normal);assert.ok(humorous);assert.equal(humorous.contextEvidence.effect.status,'supported');
 assert.ok(humorous.preferenceScore>normal.preferenceScore);
 assert.equal(chooseCandidate([{...normal,relevance:100},{...humorous,relevance:100}]).product.asin,humorous.asin);
 assert.equal(chooseCandidate([{...normal,relevance:100},{...humorous,relevance:65}]).product.asin,normal.asin);
 const neutral=publicPlan({profile:{...profile,tone:'neutral'}}),nq=[...neutral.plan.queries,...neutral.plan.fallbackQueries].find(x=>x.keywords===q.keywords);
 assert.ok(nq);assert.equal(publicCandidate({...base,researchQueryIds:[nq.id],asin:'B000000002',title:q.keywords+' umoristico'},neutral).contextEvidence.effect.status,'absent');
});
test('Personal mode removes event influence while preserving supported relationship and effect',()=>{
 const p={title:'Libro di cucina con ricette per due',tags:['culture','books']};
 const before=contextPreference(p,giftContext({occasion:'wedding',relation:'couple',interests:['culture']}),'any');
 const after=contextPreference(p,giftContext({occasion:'wedding',relation:'couple',interests:['culture'],searchPriority:'personal'}),'any');
 assert.equal(before.eventPriorityScore,1);assert.equal(after.eventPriorityScore,0);assert.equal(after.contextEvidence.relation.status,'supported');
});
test('Inventory preserves exact source IDs and all reviewed context decisions',()=>{
 const rows=pilotDictionaryInventory();assert.equal(rows.length,65);assert.equal(new Set(rows.map(r=>r.id)).size,65);
 assert.equal(rows.reduce((n,r)=>n+r.keywordIds.length,0),353);
 assert.equal(rows.filter(r=>r.rules.length).length,48);
 assert.equal(rows.filter(r=>r.relations.length||r.effects.length).length,43);
 for(const row of rows){assert.equal(row.baseQueries.length,row.keywordIds.length);assert.ok(row.gaps.length);assert.ok(row.source);}
 assert.ok(rows.every(r=>r.contextDecisions.length===20&&r.familyReview&&r.bilingualTerms.length===r.keywordIds.length));
 assert.ok(rows.find(r=>r.family==='sieri_retinolo').contextDecisions.every(d=>d.status==='no_automatic_bonus'));
});
