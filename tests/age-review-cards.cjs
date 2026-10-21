const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
for(const lang of ['it','en']){
 const r=createRuntime(lang);r.seed();
 const p=r.a.normalizeProduct({asin:'B000000001',title:'Storie di Luna',store:'Amazon',price:20,url:'https://www.amazon.it/dp/B000000001',researchMethod:true,ageVerification:'required',tags:['kidsBooks','kidsBooks_kidsStories']});
 r.a.renderProductCards([p],{ageRange:'child',budget:40,minBudget:15,timing:'none',mode:'recipient',allowUnverified:true});
 const html=r.el('#resultGrid').innerHTML;
 assert.equal(p.ageVerification,'required');assert.ok(html.includes(lang==='it'?'Età consigliata da verificare':'Recommended age needs checking'));
 assert.ok(html.indexOf('age-review-notice')<html.indexOf('data-product='));
 assert.ok(r.el('#resultsEyebrow').textContent.includes(lang==='it'?'età da verificare':'age guidance needs checking'));
 console.log(lang+': age-review badge, notice, heading and purchase-link order passed');
}
