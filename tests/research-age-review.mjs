import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {selectResearchIdeas} from '../server/research/research-engine.mjs';
const profile={ageRange:'child',interests:['kidsBooks'],subinterests:['kidsBooks_kidsStories'],budget:40,minBudget:15};
const ctx=publicPlan({profile});
const q=[...ctx.plan.queries,...ctx.plan.fallbackQueries].find(q=>q.keywords==='libri bambini');
const book={asin:'B000000001',title:'Libro bambini: le storie di Luna',features:'',productGroup:'Libro',price:20,url:'https://www.amazon.it/dp/B000000001',researchQueryIds:[q.id]};
test('Only explicitly classified books 7–12 can use the missing-age fallback',()=>{
 assert.equal(publicCandidate(book,ctx),null);
 const accepted=publicCandidate(book,{...ctx,allowAgeReview:true});assert.equal(accepted.ageVerification,'required');assert.match(accepted.ageNotice,/non indicata/);
 for(const productGroup of ['','Giocattolo','Elettronica'])assert.equal(publicCandidate({...book,productGroup},{...ctx,allowAgeReview:true}),null);
 for(const features of ['Dai 8 anni','Dai 3 ai 6 anni','Dai 7 ai 9 anni','Dai 7 ai 12 anni. Dai 13 anni'])assert.equal(publicCandidate({...book,features},{...ctx,allowAgeReview:true}),null,features);
 assert.equal(publicCandidate({...book,features:'Dai 7 ai 12 anni'},{...ctx,allowAgeReview:true}).ageVerification,'declared');
 const early=publicPlan({profile:{...profile,ageRange:'earlyChild',childStage:'preschool',interests:['earlyBooks'],subinterests:['earlyBooks_storytelling']}});
 assert.equal(publicCandidate(book,{...early,allowAgeReview:true}),null);
});
test('Documented-age books outrank unknown-age alternatives regardless of preference',()=>{
 const known=publicCandidate({...book,asin:'B000000002',features:'Dai 7 ai 12 anni'},{...ctx,allowAgeReview:true});
 const unknown=publicCandidate(book,{...ctx,allowAgeReview:true});unknown.preferenceScore=10000;
 const picked=selectResearchIdeas([unknown,known],ctx.plan).products;
 assert.equal(picked[0].asin,known.asin);
 assert.ok(picked.filter(p=>p.ageVerification==='required').every(p=>p.ageNotice.includes('non indicata')));
});
test('Missing age never bypasses device requirements or budget',()=>{
 assert.equal(publicCandidate({...book,title:'tiptoi Libro bambini storie'},{...ctx,allowAgeReview:true}),null);
 const fallback=publicCandidate(book,{...ctx,allowAgeReview:true});
 assert.equal(selectResearchIdeas([{...fallback,price:100}],ctx.plan).products.length,0);
});
test('Both localized cards show uncertainty before the purchase link',()=>{
 for(const [path,label] of [['dist/app.js','Età consigliata da verificare'],['dist/en/app.js','Recommended age needs checking']]){
 const source=fs.readFileSync(path,'utf8');assert.ok(source.includes(label));assert.ok(source.indexOf('${ageReview}${details}')<source.indexOf('data-product="${esc(fullName)}"'));
 }
});
