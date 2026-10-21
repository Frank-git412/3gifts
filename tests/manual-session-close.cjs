const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
const ids=['B09MQM4SWH','B0F2JG52KX','B0DJ27JY8S','B0FSSDBT5C','B0825PF8QL','B015NG45Q0','B0FP14Z43V'];
for(const lang of ['it','en']){
 const r=createRuntime(lang);r.seed();
 for(const asin of ids){
  const p=r.products.find(p=>p.asin===asin);assert.ok(p);assert.equal(r.products.filter(p=>p.asin===asin).length,1);
  const category=p.tags.includes('nature')?'animalsNature':p.tags.includes('writing')||p.tags.includes('productivity')?'newsBusiness':'gamesCollecting';
  const sub=['nature','puzzle','collecting','writing','productivity'].find(t=>p.tags.includes(t));
  const profile={...r.a.formData(),interests:[category],subinterests:[sub],budget:100,minBudget:0,timing:'none',allowUnverified:true};
  const ok=(changes={})=>{const d={...profile,...changes};return r.R.eligible(p,d,r.a.analyseNote(d.note),r.H.isEligible)};
  assert.equal(ok(),true,asin+' eligible');assert.equal(ok({allowUnverified:false}),false);
  assert.equal(ok({budget:Math.max(15,Math.floor((p.price-.01)/5)*5)}),p.price<=15);
  assert.equal(ok({minBudget:Math.ceil((p.price+.01)/5)*5}),false);
  for(const ageRange of ['earlyChild','child','teen'])assert.equal(ok({ageRange}),false);
  assert.equal(new URL(r.a.storeUrl(p)).searchParams.get('tag'),'3gifts-21');assert.equal(r.R.verifiedOffer(p),false);
  assert.ok(r.a.rankProducts([p],profile,r.a.analyseNote('')).some(x=>x.asin===asin));
  assert.equal(r.a.rankProducts([p],{...profile,budget:500},r.a.analyseNote('')).length,0,'high budget floor preserved');
  r.a.renderProductCards([p],profile);
 }
 for(const asin of ['B0DBF65JYY','B0GS97T2MV','B0CX5B5VTX','B0F8QPR6TV','B085Q5MNZX','B07W66F3V7'])assert.equal(r.products.filter(p=>p.asin===asin).length,1);
 assert.ok(!r.products.some(p=>p.asin==='B0GSX95J8X'||p.asin==='B0HKRNHQ4Y'));
 const all=r.products.map(p=>p.asin).filter(Boolean);assert.equal(new Set(all).size,all.length);
 console.log(lang+': seven products, category/ranking, affiliate tag, duplicates, price bounds, high-budget floor, minors and unverified-offer gates passed');
}
