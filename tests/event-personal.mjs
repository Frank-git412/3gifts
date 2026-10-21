import test from 'node:test';
import assert from 'node:assert/strict';
import {giftContext,contextPreference} from '../server/research/gift-context.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {chooseCandidate} from '../server/research/reviews.mjs';
const base={ageRange:'adult',relation:'friend',occasion:'wedding',interests:['culture'],subinterests:['books'],tone:'neutral',budget:60,minBudget:15,recipientPreference:'women'};
for(const [occasion,title] of [['wedding','Libro di cucina per coppia'],['newbaby','Libro per neogenitori'],['anniversary','Libro dei ricordi anniversario']]){
 test(`${occasion}: event relevance leads; personal mode removes every occasion signal`,()=>{
  const event=giftContext({...base,occasion});
  const personal=giftContext({...base,occasion,isRefinement:true,refinementDirection:'personal'});
  const preferred=contextPreference({title,features:''},event,'any');
  const ordinary={asin:'B000000002',relevance:100,eventPriorityScore:0};
  assert.equal(event.searchPriority,'event');assert.equal(preferred.eventPriorityScore,1);
  assert.equal(chooseCandidate([{asin:'B000000001',relevance:65,...preferred},ordinary]).product.asin,'B000000001');
  assert.equal(personal.occasion,null);assert.equal(personal.originalOccasion,occasion);
  const removed=contextPreference({title,features:''},personal,'any');
  assert.equal(removed.eventPriorityScore,0);assert.ok(!removed.matches.includes('occasion'));
  assert.equal(chooseCandidate([{asin:'B000000001',relevance:65,...removed},ordinary]).product.asin,ordinary.asin);
  const p=publicPlan({profile:{...base,occasion,searchPriority:'personal',isRefinement:true}});
  assert.equal(p.gift.searchPriority,'personal');assert.equal(p.gift.occasion,null);
  assert.ok(!p.gift.hints.includes('home'));assert.ok(!p.gift.hints.includes('care'));
 });
}
test('Personal refinement keeps exclusions, recipient and original category boundaries',()=>{
 const ctx=publicPlan({profile:{...base,isRefinement:true,searchPriority:'personal'},rejectedAsins:['B000000001'],rejectedParentAsins:['B000000100']});
 const q=ctx.plan.queries[0];
 const item={asin:'B000000001',parentAsin:'B000000100',title:q.keywords,features:'',price:30,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]};
 assert.equal(publicCandidate(item,ctx),null);
 assert.deepEqual(ctx.plan.interests,['culture']);assert.equal(ctx.plan.profile.max,60);assert.equal(ctx.plan.profile.effectiveMin,15);
 const noBooks=publicPlan({profile:{...base,isRefinement:true,searchPriority:'personal'},constraints:{exclusions:['books']}});
 assert.ok(noBooks.plan.queries.length);
 assert.ok([...noBooks.plan.queries,...noBooks.plan.fallbackQueries].every(q=>q.area==='culture'&&q.subId==='books'&&['illuminazione_lettura','supporti_lettura','segnalibri','fermalibri'].includes(q.family)));
 assert.equal(publicCandidate({...item,asin:'B000000003',parentAsin:'',title:'Romanzo di avventura',productGroup:'Books',researchQueryIds:noBooks.plan.queries.map(q=>q.id)},noBooks),null);
});
test('Other occasions and child baptism/communion do not gain birth priority',()=>{
 assert.equal(giftContext({...base,occasion:'birthday'}).eventFirst,false);
 assert.equal(giftContext({...base,occasion:'newbaby',ageRange:'child'}).eventFirst,false);
 assert.equal(giftContext({...base,occasion:'newbaby',ageRange:'earlyChild'}).eventFirst,true);
 const a=giftContext({...base,searchPriority:'personal',refinementDirection:'funny',isRefinement:true});
 assert.equal(a.occasion,null);assert.equal(a.eventFirst,false);
});
