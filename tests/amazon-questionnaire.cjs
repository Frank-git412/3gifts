const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
(async()=>{
 for(const language of ['it','en']){
 const r=createRuntime({language});r.seed();
 const original=r.products.find(p=>p.asin&&p.price>0);
 const live={...original,price:499,amazonPrice:true,amazonCheckedAt:new Date().toISOString(),imageUrl:'https://m.media-amazon.com/images/I/test.jpg',imageSource:'Amazon',offer:null};
 r.c.fetch=async(url,options)=>{assert.equal(url,'/api/amazon/catalog');assert.equal(options.method,'GET');assert.equal(options.body,undefined);return {ok:true,json:async()=>({products:[live]})};};
 const products=await r.a.fetchMarketplaceProducts({...r.a.formData(),note:'PRIVATE NOTE'});assert.equal(products[0].amazonPrice,true);
 const p=r.a.normalizeProduct(live);assert.equal(r.R.eligible(p,{...r.a.formData(),allowUnverified:true,budget:50,minBudget:0},r.a.analyseNote(''),()=>true),false);
 r.a.renderProductCards([p],{...r.a.formData(),timing:'none',allowUnverified:true});
 const html=r.el('#resultGrid').innerHTML;assert.match(html,/499/);assert.match(html,/Amazon/);assert.match(html,/media-amazon/);assert.ok(!html.includes('Totale verificato'));
 }
 console.log('Questionnaire: private GET, API data rendering, budget exclusion and IT/EN passed.');
})().catch(e=>{console.error(e);process.exit(1)});
