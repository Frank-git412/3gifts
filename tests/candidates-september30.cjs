const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createRuntime}=require('./published-runtime.cjs');
const data=JSON.parse(fs.readFileSync('catalog-products.json'));
const items=data.products.filter(x=>x.researchPosition);
assert.equal(data.count,data.products.length);
assert.equal(new Set(data.products.map(x=>x.id)).size,data.count);
for(const p of items)assert.equal(data.products.filter(x=>x.asin===p.asin).length,1);
for(const language of ['it','en']){
 const r=createRuntime(language);r.seed();
 for(const raw of items){
  const p=r.products.find(x=>String(x.id)===String(raw.id));
  const profile={...r.a.formData(),interests:[p.tags[0]],subinterests:[p.tags[1]],ageRange:p.id==='438'?'earlyChild':p.ageSuitability?'child':'adult',childStage:p.id==='438'?'toddler':undefined,budget:Math.ceil(p.price/5)*5,minBudget:0,timing:'none',note:'',allowUnverified:true};
  assert.ok(r.inputs.some(x=>x.name==='interest'&&x.value===profile.interests[0]),'Real questionnaire category');
  assert.ok(r.inputs.some(x=>x.name==='subinterest'&&x.value===profile.subinterests[0]),'Real questionnaire subcategory');
  const ok=(changes={})=>{let f={...profile,...changes};return r.R.eligible(p,f,r.a.analyseNote(f.note),r.H.isEligible)};
  assert.ok(ok(),`${language} ${p.id}: selectable`);
  assert.equal(ok({budget:Math.max(15,Math.floor((p.price-0.01)/5)*5)}),p.price<=15);
  assert.equal(ok({budget:500,minBudget:Math.ceil((p.price+0.01)/5)*5}),false);
  assert.equal(ok({interests:['sportFitness'],subinterests:['sport']}),false);
  assert.equal(ok({ageRange:'earlyChild',childStage:'preschool'}),false);
  if(p.id==='438'){assert.equal(ok({ageRange:'earlyChild',childStage:'infant'}),false);assert.equal(ok({ageRange:'child'}),false);}
  assert.equal(ok({allowUnverified:false}),false);
  assert.equal(r.R.verifiedOffer(p),false);
  const url=new URL(r.a.storeUrl(p));assert.equal(url.hostname,'www.amazon.it');assert.equal(url.searchParams.get('tag'),'3gifts-21');assert.ok(url.pathname.includes(p.asin));
  const focused={...profile,minBudget:Math.floor(p.price/5)*5};
  assert.ok(r.a.rankProducts(r.products,focused,r.a.analyseNote('')).some(x=>x.id===p.id),`${p.id} reachable in results`);
 }
 console.log(JSON.stringify({language,products:items.length,eligibilityBudgetAgeLinksAndRanking:'passed',browserQA:false}));
}
