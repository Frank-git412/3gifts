const assert=require('node:assert/strict');const {createRuntime}=require('./published-runtime.cjs');
for(const lang of ['it','en']){
 const r=createRuntime(lang);r.seed();for(const[k,v]of Object.entries({interest:['foodDrink'],subinterest:['food'],budgetChoice:'80',timing:'none'}))r.set(k,v);
 const base={...r.a.formData(),allowUnverified:true},asins=['B0F8QPR6TV','B085Q5MNZX','B07W66F3V7'];const items=asins.map(a=>r.products.find(p=>p.asin===a));
 const ok=(p,changes={})=>{const profile={...base,...changes};return r.R.eligible(p,profile,r.a.analyseNote(profile.note),r.H.isEligible)};
 for(const p of items){assert.ok(p&&ok(p));assert.equal(r.products.filter(x=>x.asin===p.asin).length,1);assert.equal(r.R.verifiedOffer(p),false);assert.equal(p.priceStatus,'indicative');assert.equal(new URL(r.a.storeUrl(p)).searchParams.get('tag'),'3gifts-21');for(const ageRange of ['earlyChild','child','teen'])assert.equal(ok(p,{ageRange}),false);}
 assert.equal(ok(items[1],{budget:40}),false,'editorial exception never overrides visitor budget');assert.equal(ok(items[1],{avoid:['foodAlcohol']}),false);assert.equal(ok(items[1],{note:lang==='it'?'Niente birra':'No beer'}),false);
 assert.equal(r.a.rankProducts(items,base,r.a.analyseNote('')).length,3);assert.ok(!r.products.some(p=>p.asin==='B0GSX95J8X'));
 const html=r.a.renderProductCards(items,base); console.log(lang+': category, affiliate, deduplication, minors, alcohol and budget checks passed');
}
