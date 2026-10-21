import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rankingProfile,weightedRanking,chooseWeightedCandidate,RANKING_WEIGHTS} from '../server/research/weighted-ranking.mjs';
import {giftContext} from '../server/research/gift-context.mjs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {selectResearchIdeas,matchResearchProduct} from '../server/research/research-engine.mjs';
import {declaredAgeRange} from '../server/research/product-requirements.mjs';
const match=score=>[{score,queryId:'q1',area:'culture',subId:'books',family:'narrativa'}];
const supported={status:'supported',source:'listing_title_features',evidence:[{field:'features',matched:'uso documentato',status:'supported'}]};
const partial={status:'partial',source:'listing_title_features',evidence:[{field:'features',matched:'proprietà parziale',status:'supported'},{status:'absent'}]};
const profile={ageRange:'adult',interests:['culture'],subinterests:['books'],budget:60,minBudget:15,occasion:'birthday',relation:'friend'};
const item=(asin,score,config,fields={})=>{const p={asin,title:'Libro test',features:'',matches:match(score),...fields};return {...p,ranking:weightedRanking(p,p.matches,config)};};
test('M2 numerical example: category precedence; event switches result; personal restores it',()=>{
 const ordinary=rankingProfile({},giftContext({occasion:'birthday'}));
 const a=item('B000000001',.7,ordinary,{contextEvidence:{occasion:supported}}),b=item('B000000002',1,ordinary);
 assert.ok(Math.abs(a.ranking.score-60.526315789)<1e-8);assert.ok(Math.abs(b.ranking.score-78.947368421)<1e-8);
 assert.equal(chooseWeightedCandidate([a,b]).product.asin,b.asin);
 const wedding=rankingProfile({},giftContext({occasion:'wedding'}));
 const wa=item(a.asin,.7,wedding,{eventEvidence:supported}),wb=item(b.asin,1,wedding);
 assert.equal(chooseWeightedCandidate([wa,wb]).product.asin,wa.asin);
 const personal=rankingProfile({},giftContext({occasion:'wedding',searchPriority:'personal'}));
 assert.equal(personal.denominator,45);assert.equal(personal.active.occasion,false);
 assert.equal(chooseWeightedCandidate([item(a.asin,.7,personal,{eventEvidence:supported}),item(b.asin,1,personal)]).product.asin,b.asin);
});
test('Five weights, common denominator and absence do not inflate a candidate',()=>{
 assert.deepEqual(RANKING_WEIGHTS,{category:45,note:20,effect:15,occasion:12,relation:8});
 const config=rankingProfile({signals:['books']},giftContext({occasion:'birthday',relation:'friend'}),'useful');
 const full=item('B000000001',1,config,{contextEvidence:{effect:supported,occasion:supported,relation:supported}});
 const missing=item('B000000002',1,config,{title:'Oggetto test'});
 assert.equal(full.ranking.denominator,100);assert.equal(missing.ranking.denominator,100);
 assert.equal(full.ranking.score,100);assert.equal(missing.ranking.score,45);
 assert.equal(missing.ranking.signals.note.value,0);
});
test('Mandatory note signals and exclusions never earn a second bonus',()=>{
 const c=rankingProfile({signals:['books','calm'],requiredSignals:['books','calm'],exclusions:['horror']},{});
 assert.equal(c.active.note,false);assert.equal(c.denominator,45);assert.equal(c.noteStatus,'mandatory_only_no_bonus');
 assert.deepEqual(rankingProfile({signals:['books','calm'],requiredSignals:['books']},{}).noteSignals,['calm']);
});
test('Optional note evidence comes from affirmative listing fields, never query or user tags',()=>{
 const c=rankingProfile({signals:['books','travel']},{});
 assert.equal(item('B000000001',1,c,{title:'Libro test',features:'Formato viaggio'}).ranking.signals.note.value,1);
 assert.equal(item('B000000002',1,c,{title:'Libro test'}).ranking.signals.note.value,.5);
 assert.equal(item('B000000003',1,c,{title:'Oggetto',tags:['books','travel'],queries:['Libro formato viaggio']}).ranking.signals.note.value,0);
 const negative=item('B000000004',1,c,{title:'Oggetto',features:'Non è un libro. Non in formato viaggio.'});
 assert.equal(negative.ranking.signals.note.value,0);
});
test('Partial context gets half score, contradiction and unsupported generic labels get zero',()=>{
 const c=rankingProfile({},giftContext({occasion:'wedding',relation:'friend'}),'useful');
 const p=item('B000000001',1,c,{eventEvidence:partial,contextEvidence:{effect:partial,relation:{status:'contradictory',evidence:supported.evidence}}});
 assert.equal(p.ranking.signals.effect.value,.5);assert.equal(p.ranking.signals.occasion.value,.5);assert.equal(p.ranking.eventTier,0);assert.equal(p.ranking.signals.relation.value,0);
 assert.equal(item('B000000002',1,c,{title:'Libro regalo romantico utile',eventPriorityScore:99,preferenceScore:99}).ranking.eventTier,0);
});
test('Category tier outranks a high contextual score without priority event',()=>{
 const c=rankingProfile({signals:['books']},giftContext({occasion:'birthday',relation:'friend'}),'useful');
 const generic=item('B000000001',.75,c,{contextEvidence:{effect:supported,occasion:supported,relation:supported}}),specific=item('B000000002',1,c,{title:'Titolo'});
 assert.ok(generic.ranking.score>specific.ranking.score);assert.equal(chooseWeightedCandidate([generic,specific]).product.asin,specific.asin);
});
test('Lexical fractions within a category tier no longer defeat stronger documented preferences',()=>{
 const c=rankingProfile({},giftContext({relation:'friend'}),'useful');
 const generic=item('B000000001',.99,c),useful=item('B000000002',.67,c,{contextEvidence:{effect:supported}});
 assert.equal(generic.ranking.categoryTier,.5);assert.equal(useful.ranking.categoryTier,.5);assert.equal(chooseWeightedCandidate([generic,useful]).product.asin,useful.asin);
});
test('All ties ignore reviews and legacy bonuses and use a stable identifier',()=>{
 const c=rankingProfile({},{}),a=item('B000000001',1,c),b=item('B000000002',1,c,{preferenceScore:10000,reviews:{rating:5,count:100000,source:'unverified',checkedAt:new Date().toISOString()}});
 for(const order of [[a,b],[b,a]])assert.equal(chooseWeightedCandidate(order).product.asin,a.asin);
 assert.equal(b.ranking.reviewsUsed,false);
});
test('Documented age remains ahead of a high event score with age to verify',()=>{
 const c=rankingProfile({},giftContext({occasion:'wedding'}));
 const known=item('B000000002',.7,c,{ageVerification:'declared'}),unknown=item('B000000001',1,c,{ageVerification:'required',eventEvidence:supported});
 assert.equal(chooseWeightedCandidate([unknown,known]).product.asin,known.asin);
});
test('Evidence completeness precedes diversity and identifier; diversity is only a tie breaker',()=>{
 const c=rankingProfile({},{}),a=item('B000000001',1,c),b=item('B000000002',1,c);
 b.matches=[{...b.matches[0],subId:'comics'}];
 assert.equal(chooseWeightedCandidate([a,b],[a]).product.asin,b.asin);
 a.ranking.evidenceCompleteness=2;
 assert.equal(chooseWeightedCandidate([a,b],[a]).product.asin,a.asin);
});
test('Public pipeline retains filters and gives admitted candidates complete scoring traces',()=>{
 const ctx=publicPlan({profile});const q=ctx.plan.queries[0];
 const make=(asin,price=30)=>publicCandidate({asin,title:q.keywords,features:q.keywords,price,url:'https://www.amazon.it/dp/'+asin,researchQueryIds:[q.id]},ctx);
 const good=make('B000000001');assert.ok(good);
 const other={...good,asin:'B000000002',price:1000};
 const result=selectResearchIdeas([good,other],ctx.plan);
 assert.equal(result.products.length,1);assert.equal(result.finalSelection.find(d=>d.asin===other.asin).reason,'outside_budget');
 const d=result.finalSelection.find(d=>d.asin===good.asin);
 assert.equal(d.ranking.version,ctx.plan.ranking.version);assert.equal(d.position,1);assert.equal(Object.keys(d.ranking.signals).length,5);assert.ok(d.queryMatches.some(m=>m.queryId===q.id));
});
test('Current IT/EN visible explanations correctly state that reviews are not used',()=>{
 for(const [path,phrase] of [['dist/app.js','Le recensioni non sono ancora usate per ordinare'],['dist/en/app.js','Reviews are not yet used for ranking'],['dist/terms.html','Le recensioni non sono attualmente usate per ordinare'],['dist/en/terms.html','Reviews are not currently used for ranking'],['dist/affiliate.html','Le recensioni non sono attualmente usate per ordinare'],['dist/en/affiliate.html','Reviews are not currently used for ranking']])assert.ok(fs.readFileSync(path,'utf8').includes(phrase),path);
 for(const path of ['dist/app.js','dist/en/app.js'])assert.ok(!fs.readFileSync(path,'utf8').includes('Le proposte sono ordinate per pertinenza e qualità'));
});
test('C25: educational books cannot fill stories merely through generic book queries',()=>{
 const ctx=publicPlan({profile:{ageRange:'child',interests:['kidsBooks'],subinterests:['kidsBooks_kidsStories'],budget:40,minBudget:15}});
 const q=[...ctx.plan.queries,...ctx.plan.fallbackQueries].find(q=>q.keywords==='libri bambini');
 const p={productGroup:'Book',title:'',features:''};
 for(const title of ['La storia della Terra. Libro per bambini con contenuti e attività extra','Il mio corpo è solo mio. Libro illustrato per bambini sulla sicurezza e i confini personali','Earth history. Science book for children','My body is mine. A personal safety book for children','Libro bambini senza racconti','Children book without stories'])assert.equal(matchResearchProduct({...p,title},q),0,title);
 for(const title of ['Una strega in soffitta: Una divertente e magica avventura per bambini dai 7 ai 12 anni','Libro bambini: le storie di Luna'])assert.ok(matchResearchProduct({...p,title},q),title);
 assert.ok(matchResearchProduct({...p,title:'Le avventure di Luna',features:'Racconti dai 7 ai 12 anni'},q));
 assert.ok(matchResearchProduct({...p,title:'La storia della Terra',features:'Un romanzo di avventura per bambini'},q));
 assert.equal(matchResearchProduct({...p,title:'NATIONAL GEOGRAPHIC KIDS - La Grande Enciclopedia Degli Animali',features:'Avventure a pagina aperta. Viaggio educativo attraverso habitat e specie.'},q),0);
 assert.equal(matchResearchProduct({...p,title:'Diario delle Avventure Estive per Bambini dai 7 agli 11 Anni: Attività creative, missioni settimanali e spazi per raccontarsi'},q),0);
 assert.ok(matchResearchProduct({...p,title:'Diario di una schiappa',features:'Romanzo per bambini'},q));
});
test('C25 explicit 7 agli 11 range is not mistaken for absent age',()=>{
 for(const title of ['Libro dai 7 agli 11 anni','Libro dai 7 ai 11 anni','Book ages 7 to 11 years'])assert.deepEqual(declaredAgeRange({title}),{minimumMonths:84,maximumMonths:132,conflict:false});
 const ctx=publicPlan({profile:{ageRange:'child',interests:['kidsBooks'],subinterests:['kidsBooks_kidsStories'],budget:40,minBudget:15}}),q=ctx.plan.queries[0];
 const reasons={};assert.equal(publicCandidate({asin:'B000000009',title:'Libro bambini racconti dai 7 agli 11 anni',productGroup:'Book',features:'',price:20,url:'https://www.amazon.it/dp/B000000009',researchQueryIds:[q.id]},{...ctx,allowAgeReview:true},reasons),null);
 assert.equal(reasons.age_range_too_young,1);
});
