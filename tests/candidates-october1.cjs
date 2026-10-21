const assert=require('node:assert/strict'),fs=require('node:fs');
const {createRuntime}=require('./published-runtime.cjs');
const raw=JSON.parse(fs.readFileSync('catalog-products.json')).products;
for(const lang of ['it','en']){
 const r=createRuntime(lang);r.seed();
 for(const id of [439,440,441,442]){
  const source=raw.find(x=>x.id===id),p=r.products.find(x=>String(x.id)===String(id));
  assert.ok(p);assert.equal(raw.filter(x=>x.asin===p.asin).length,1);
  const profile={...r.a.formData(),interests:[source.tags[0]],subinterests:[source.tags[1]],ageRange:id>=441?'earlyChild':'adult',childStage:id>=441?'preschool':undefined,budget:40,minBudget:0,timing:'none',note:'',allowUnverified:true};
  const eligible=(changes={})=>{const f={...profile,...changes};return r.R.eligible(p,f,r.a.analyseNote(''),r.H.isEligible)};
  assert.ok(eligible(),`${id} eligible`);assert.equal(eligible({minBudget:35}),false);assert.equal(eligible({allowUnverified:false}),false);assert.equal(eligible({ageRange:'earlyChild',childStage:'infant'}),false);assert.equal(eligible({ageRange:'child'}),false);
  const u=new URL(r.a.storeUrl(p));assert.equal(u.hostname,'www.amazon.it');assert.equal(u.searchParams.get('tag'),'3gifts-21');assert.equal(r.R.verifiedOffer(p),false);
  assert.ok(r.a.rankProducts([p],profile,r.a.analyseNote('')).some(x=>x.id===p.id));
 }
 console.log(lang+': category, age, budget, affiliate and ranking checks passed');
}
assert.equal(raw.length,163);assert.equal(new Set(raw.map(p=>p.id)).size,163);
