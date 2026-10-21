const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createRuntime} = require('./published-runtime.cjs');
(async()=>{
const source=JSON.parse(fs.readFileSync('catalog-products.json'));
assert.equal(source.count,145);
assert.equal(source.products.filter(p=>p.asin).length,75);
assert.equal(new Set(source.products.filter(p=>p.asin).map(p=>p.asin)).size,75);
assert.equal(source.products.some(p=>p.id===409),false);
assert.deepEqual(source.products.find(p=>p.id===289).alternativeAsins,['B00004TZY8']);
for(const language of ['it','en']){
 const r=createRuntime(language);r.seed();
 for(const [k,v] of Object.entries({ageRange:'earlyChild',childStage:'toddler',interest:['earlyBuilding'],subinterest:['earlyBuilding_stacking'],budgetChoice:'15',timing:'none',note:''}))r.set(k,v).dispatchEvent({type:'change'});
 const profile={...r.a.formData(),allowUnverified:true};
 const check=(product,changes={})=>{const p={...profile,...changes};return r.R.eligible(product,p,r.a.analyseNote(p.note),r.H.isEligible)};
 for(const id of [417,418]){
  const p=r.products.find(x=>String(x.id)===String(id));assert.ok(p);
  assert.ok(check(p),`${language} toddler ${id}`);
  assert.equal(p.price,9.9);assert.equal(p.priceStatus,'indicative');assert.equal(r.R.verifiedOffer(p),false);
  for(const changes of [{childStage:'infant'},{childStage:'preschool'},{childStage:'all'},{ageRange:'child'},{allowUnverified:false},{timing:'urgent2',deadline:r.R.dateAfter(2)},{minBudget:15},{interests:['earlyMusic'],subinterests:['earlyMusic_musicToys']}])assert.equal(check(p,changes),false,`${language} conservative ${JSON.stringify(changes)}`);
  assert.ok(r.a.storeUrl(p).includes(p.asin));assert.ok(r.a.storeUrl(p).includes('tag=3gifts-21'));
 }
 await r.a.showResults();assert.match(r.el('#resultGrid').innerHTML,/Amazon/);assert.doesNotMatch(r.el('#resultGrid').innerHTML,/Etsy/);
 const cat=r.products.find(x=>String(x.id)==='47');
 const adult={...profile,ageRange:'adult',childStage:null,interests:['animalsNature'],subinterests:['pets'],budget:50};
 for(const note of ['Ha un gatto','Possiede due gatti','She owns a cat','He has two cats'])assert.ok(check(cat,{...adult,note}),note);
 for(const note of ['','Ama gli animali','Ha un cane','Non ha un gatto','Vorrebbe un gatto','Se ha un gatto','Maybe she owns a cat',"She doesn't have a cat",'She wants a cat','She had a cat'])assert.equal(check(cat,{...adult,note}),false,note);
 assert.equal(check(cat,{...adult,note:'Ha un gatto',allowUnverified:false}),false);
 const uno=r.products.find(x=>String(x.id)==='289');assert.ok(r.R.ageEligible(uno,{ageRange:'child'}));assert.equal(r.products.filter(x=>/\bUNO\b/i.test(x.name)).length,1);
 console.log(language+': new toddler products, ownership, deduplication and offer restrictions passed');
}
})().catch(e=>{console.error(e);process.exit(1)});
