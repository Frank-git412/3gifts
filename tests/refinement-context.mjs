import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPlan,publicCandidate,publicRecommendation} from '../server/research/public-adapter.mjs';
import {RELATION_CONTEXT,OCCASION_CONTEXT} from '../server/research/gift-context.mjs';
import {RESEARCH_CATALOG} from '../server/research/catalog-data.mjs';
import {researchFamilyId} from '../server/research/research-engine.mjs';
import {chooseCandidate} from '../server/research/reviews.mjs';
const profile={ageRange:'adult',relation:'friend',occasion:'birthday',interests:['culture'],subinterests:['books'],tone:'neutral',budget:60,minBudget:15,recipientPreference:'unisex'};
const candidate=(q,extra={})=>({asin:'B000000001',parentAsin:'B000000100',title:q.keywords,features:'',price:30,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id],...extra});
test('Funny refinement is a preference; a valid product without funny/social tags survives',()=>{
 const ctx=publicPlan({profile:{...profile,isRefinement:true,tone:'funny',refinementDirection:'funny'}}),q=ctx.plan.queries[0];
 assert.match(q.searchKeywords,/divertente/);
 const normal=publicCandidate(candidate(q),ctx),funny=publicCandidate(candidate(q,{asin:'B000000002',title:q.keywords+' umoristico divertente'}),ctx);
 assert.ok(normal);assert.ok(funny);assert.ok(funny.preferenceScore>normal.preferenceScore);
 assert.equal(chooseCandidate([{...normal,relevance:100},{...funny,relevance:100}]).product.asin,funny.asin);
 assert.equal(chooseCandidate([{...normal,relevance:100},{...funny,relevance:65}]).product.asin,normal.asin);
});
test('All 5 recipient choices and 9 occasions change actual Amazon search words',()=>{
 for(const [relation,rule] of Object.entries(RELATION_CONTEXT)){
  const ctx=publicPlan({profile:{...profile,relation}});assert.ok(ctx.plan.queries.some(q=>q.searchKeywords?.includes('per '+rule.term)));assert.ok(ctx.plan.queries.some(q=>!q.contextual));
 }
 const signatures=[];
 for(const [occasion,rule] of Object.entries(OCCASION_CONTEXT)){
  const queries=publicPlan({profile:{...profile,occasion}}).plan.queries;
  // Anniversary now targets an actual use instead of requiring the event word.
  if(occasion==='anniversary')assert.ok(queries.some(q=>q.eventTargeted&&q.contextRule==='books-anniversary'&&/ricordi/.test(q.searchKeywords)));
  else assert.ok(queries.some(q=>q.searchKeywords?.includes(rule.term)));
  signatures.push(JSON.stringify(queries.map(q=>q.searchKeywords||q.keywords)));
 }
 assert.equal(new Set(signatures).size,Object.keys(OCCASION_CONTEXT).length);
});
test('Previously shown families are a preference unless a different type is explicitly requested',()=>{
 const first=publicPlan({profile}),q=first.plan.queries.find(q=>!q.contextual),product=publicCandidate(candidate(q),first),key='concept:'+product.conceptFamily;
 const refine=publicPlan({profile:{...profile,isRefinement:true},seenConcepts:[...new Set(RESEARCH_CATALOG.associations.filter(k=>k.area==='culture').map(k=>'concept:'+researchFamilyId(k.area,k.family)))]});
 const same=refine.plan.queries.concat(refine.plan.fallbackQueries).find(x=>x.keywords===q.keywords);
 // The family remains available in the candidate dictionary even when fresh families lead.
 assert.ok(refine.plan.candidateQueries.some(x=>x.family===q.family));
 if(same)assert.ok(publicCandidate(candidate(same),refine));
 const strict=publicPlan({profile:{...profile,isRefinement:true},rejectedConcepts:[key]});assert.ok(!strict.plan.candidateQueries.some(x=>x.area===q.area&&x.family===q.family));
});
test('Refinement excludes exact ASINs and parent variants without weakening hard constraints',()=>{
 const ctx=publicPlan({profile,rejectedAsins:['B000000001'],rejectedParentAsins:['B000000100']}),q=ctx.plan.queries[0];
 assert.equal(publicCandidate(candidate(q),ctx),null);assert.equal(publicCandidate(candidate(q,{asin:'B000000002'}),ctx),null);
 const noBooks=publicPlan({profile,constraints:{exclusions:['books']}});
 const light=noBooks.plan.queries.find(q=>q.family==='illuminazione_lettura');assert.ok(light);
 assert.ok(publicCandidate(candidate(light,{title:'Lampada da lettura per libri'}),noBooks));
 assert.equal(publicCandidate(candidate(light,{title:'Romanzo di avventura',productGroup:'Books'}),noBooks),null);
 assert.equal(publicPlan({profile:{...profile,isRefinement:true},constraints:{requiredTypes:['experience']}}).blocked,true);
});
test('Refinement preserves the automatic floor; only an explicit new budget changes it',()=>{
 assert.equal(publicPlan({profile:{...profile,budget:500,minBudget:30}}).plan.profile.effectiveMin,250);
 assert.equal(publicPlan({profile:{...profile,budget:500,minBudget:30,isRefinement:true}}).plan.profile.effectiveMin,250);
 assert.equal(publicPlan({profile:{...profile,budget:100,minBudget:30,isRefinement:true}}).plan.profile.effectiveMin,30);
 assert.equal(publicPlan({profile:{...profile,budget:500,minBudget:350,isRefinement:true}}).plan.profile.effectiveMin,350);
});
test('All categories explicitly excluded gives a valid empty result, not InvalidProfile',async()=>{
 const request=new Request('https://3gifts.it/api/amazon/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify({profile:{...profile,excludedInterests:['culture'],isRefinement:true}})});
 const result=await publicRecommendation(request,{});assert.equal(result.status,200);assert.equal((await result.json()).searched,0);
});

test('Context matching uses word starts: tranexamico is not amico; bulk favors receive lower preference',async()=>{
 const {contextPreference,giftContext}=await import('../server/research/gift-context.mjs');
 const ctx=giftContext({relation:'friend',occasion:'birthday'});
 assert.ok(!contextPreference({title:'Crema Acido Tranexamico 4%',features:''},ctx,'any').matches.includes('recipient'));
 const normal=contextPreference({title:'Crema mani confezione regalo compleanno per amici',features:''},ctx,'any');
 const bulk=contextPreference({title:'Set regalo di 70 creme mani per amici compleanno',features:''},ctx,'any');
 assert.ok(normal.score>bulk.score);
 const observedBulk=contextPreference({title:'Mini crema per le mani, set regalo, 120 pezzi, per mani secche e screpolate',features:''},ctx,'any');
 assert.ok(observedBulk.score<0);
});
test('Observed pastry kit plus ebook cannot pass as a cookbook',async()=>{
 const {checkProductRequirements}=await import('../server/research/product-requirements.mjs');
 const q={keywords:'libri cucina',originalKeyword:'libri cucina'};
 const kit={title:'Kit Pasticceria Decorazioni Torte Set 356pcs, Nifogo Utensili Pasticceria con Giradischi, Beccucci, sac a Poche, Decorazioni Torta Compleanno, E-libro'};
 assert.equal(checkProductRequirements(kit,q).passed,false);
 assert.equal(checkProductRequirements({title:'Libro di cucina: manuale di pasticceria e decorazioni torte'},q).passed,true);
 assert.equal(checkProductRequirements({title:'Set di libri cucina italiana'},q).passed,true);
 assert.equal(checkProductRequirements({title:'Definizione di migliore amico, regalo di compleanno, libro di cucina con pagine vuote, quaderno di ricette'},q).passed,false);
 assert.equal(checkProductRequirements({title:'Quaderno di ricette da compilare'}, {keywords:'quaderno di ricette'}).passed,true);
});
