import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {publicPlan,publicCandidate,publicRecommendation} from '../server/research/public-adapter.mjs';
import {CHILD_STAGE_RULES} from '../server/research/public-rules.mjs';
import {matchResearchProduct} from '../server/research/research-engine.mjs';
import {declaredAgeRange} from '../server/research/product-requirements.mjs';
const profile={ageRange:'child',interests:['kidsBooks'],subinterests:['kidsBooks_kidsStories'],budget:40,minBudget:15,childStage:'preschool'};
test('Stage rules mirror all early-child questionnaire inputs',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const ids=[...html.matchAll(/name="(?:subinterest|interest)" value="(early\w+)"/g)].map(m=>m[1]);
 assert.equal(Object.keys(CHILD_STAGE_RULES).length,ids.length);
 for(const id of ids)assert.ok(CHILD_STAGE_RULES[id]?.length,id);
 assert.deepEqual(CHILD_STAGE_RULES.earlySensory_rattles,['infant']);
});
test('Historical preschool rattles case stops without Amazon calls',async()=>{
 const p={...profile,ageRange:'earlyChild',interests:['earlySensory'],subinterests:['earlySensory_rattles']};
 const request=new Request('https://3gifts.it/api/amazon/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify({profile:p})});
 const body=await(await publicRecommendation(request,{})).json();
 assert.equal(body.reason,'ChildStageMismatch');assert.equal(body.searched,0);assert.equal(body.efficiency.amazonCalls,0);
 const valid=publicPlan({profile:{...p,childStage:'toddler',subinterests:[]}});
 assert.ok(valid.plan.queries.length);assert.ok([...valid.plan.queries,...valid.plan.fallbackQueries].every(q=>q.associations.every(a=>a.subId==='earlySensory_sensoryToys')));
});
test('Age-targeted recovery preserves query identity, budget and twelve-call ceiling',()=>{
 const ctx=publicPlan({profile}),qs=[...ctx.plan.queries,...ctx.plan.fallbackQueries];
 assert.ok(qs.length<=12);assert.ok(qs.some(q=>q.ageTargeted&&q.searchKeywords.endsWith('dai 7 anni')));
 for(const q of qs){assert.equal(q.max,40);assert.equal(q.min,15);assert.ok(q.associations.every(a=>a.subId==='kidsBooks_kidsStories'));}
 const q=qs[0],p={asin:'B000000001',title:'Libri bambini storie di avventura',features:'',productGroup:'Book',price:20,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]};
 const diagnostics={};assert.equal(publicCandidate(p,ctx,diagnostics),null);assert.equal(diagnostics.age_evidence_missing,1);
});
test('Book classification rescues named stories but not other objects, genres or missing age',()=>{
 const q={area:'kidsBooks',keywords:'libri bambini',recipientContext:{}};
 const book={title:'Le avventure di Luna',features:'Racconti dai 7 anni',productGroup:'Book'};
 assert.ok(matchResearchProduct(book,q));
 assert.equal(matchResearchProduct({...book,title:'tiptoi Libro avventure dai 7 anni'},q),0);
 assert.equal(matchResearchProduct({...book,features:'Racconti dai 7 anni, richiede penna elettronica'},q),0);
 assert.equal(matchResearchProduct({...book,productGroup:'Toy'},q),0);
 assert.equal(matchResearchProduct({...book,title:"Magneti Book pompieri gioco magnetico dai 3 anni",productGroup:'Giocattolo'},q),0);
 assert.equal(matchResearchProduct({...book,title:'Fatti incredibili libro bambini',features:'Dai 7 anni'},{...q,associations:[{subId:'kidsBooks_kidsStories'}]}),0);
 assert.equal(matchResearchProduct(book,{...q,keywords:'libri gialli bambini'}),0);
 assert.equal(matchResearchProduct({...book,title:'Quaderno da compilare'},q),0);
 assert.equal(matchResearchProduct({...book,title:'Esercizi per la scuola primaria'},q),0);
 assert.equal(declaredAgeRange({...book,features:''}).minimumMonths,null);
});
test('Compact age lists preserve upper bounds and reject conflicting evidence',()=>{
 assert.deepEqual(declaredAgeRange({title:'Storie bambini 7,8,9,10,11,12 anni'}),{minimumMonths:84,maximumMonths:144,conflict:false});
 assert.equal(declaredAgeRange({title:'Storie bambini 7/8/9 anni'}).maximumMonths,108);
 assert.equal(declaredAgeRange({title:'Storie bambini 7,8,9 anni',features:'Dai 10 anni'}).conflict,true);
});
