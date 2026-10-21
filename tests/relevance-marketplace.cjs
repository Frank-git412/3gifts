// Current marketplace policy: Amazon only; relevance still ranks eligible Amazon products.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createRuntime}=require('./published-runtime.cjs');
const paused=JSON.parse(fs.readFileSync('catalog-etsy-paused.json','utf8')).products;
const source=JSON.parse(fs.readFileSync('catalog-products.json','utf8'));
let assertions=0;
const check=(v,message)=>{assert.ok(v,message);assertions++};
(async()=>{
 check(source.count===source.products.length&&source.products.every(p=>p.store==='Amazon'),'active source count consistent and Amazon only');
 check(paused.length===120,'Etsy records preserved outside active catalog');
 for(const language of ['it','en']){
  const r=createRuntime(language);r.seed();
  r.set('interest',['techGaming','culture']);r.set('budgetChoice','300');r.set('timing','none');
  const base={...r.a.formData(),allowUnverified:true};
  const archived=paused.map(r.a.normalizeProduct);
  check(r.products.length===source.count&&r.products.every(p=>p.store==='Amazon'),language+': shipped catalog matches source and only Amazon');
  for(const p of archived)check(!r.R.eligible(p,base,r.a.analyseNote(''),r.H.isEligible),language+': archived Etsy rejected');
  const amazon=r.products.find(p=>p.asin==='B07W6GFKXS');
  check(!!amazon&&r.R.marketplaceEligible(amazon),language+': existing Amazon allowed');
  check(!r.R.marketplaceEligible({...amazon,store:'Etsy'}),language+': seller label enforced');
  check(!r.R.marketplaceEligible({...amazon,directUrl:archived[0].directUrl}),language+': mislabeled Etsy link rejected');
  check(!r.R.marketplaceEligible({...amazon,offer:{url:archived[0].directUrl}}),language+': foreign offer URL rejected');
  check(!r.R.productLink('https://www.amazon.it/s?k=regalo'),language+': search links remain excluded');
  for(const area of ['techGaming','culture','mediaAudio','foodDrink','travelOutdoor','sportFitness','artPhoto','homeGarden','styleBeauty','animalsNature','gamesCollecting','newsBusiness']){
   const profile={...base,interests:[area],subinterests:[]};
   const picks=r.a.rankProducts([...r.products,...archived],profile,r.a.analyseNote(''));
   check(picks.every(p=>p.store==='Amazon'&&r.R.productLink(p.directUrl)&&r.R.interestEligible(p,profile,r.a.analyseNote(''))),language+': area stays pertinent and Amazon-only '+area);
  }
  const profile={...base,interests:['techGaming'],subinterests:[]};
  const onlyEtsy=archived.map(p=>({...p,tags:['techGaming','tech','practical'],rating:5,reviewCount:10000,price:20}));
  check(r.a.rankProducts(onlyEtsy,profile,r.a.analyseNote('')).length===0,language+': no Etsy fallback even when highly ranked');
  check(r.a.rankProducts(r.products,{...profile,timing:'urgent2',deadline:r.R.dateAfter(2),allowUnverified:false},r.a.analyseNote('')).length===0,language+': verification gate retained');
  r.c.remotePayload={products:[...paused,source.products.find(p=>p.asin==='B07W6GFKXS')]};
  r.c.fetch=async()=>({ok:true,json:async()=>r.c.remotePayload});
  r.eval('CONFIG.catalogProductsEndpoint="https://catalog.example.test/items"');
  const remote=await r.a.fetchMarketplaceProducts(base);
  check(remote.length===1&&remote[0].store==='Amazon',language+': mixed feed filtered');
  // Use a populated band for the positive UI journey; the separate upper-budget
  // suite covers sparse first searches at >=150 EUR without cheap fillers.
  r.set('budgetChoice','50');
  await r.a.showResults();
  check(r.eval('displayedProducts.length')>0,language+': initial results exist');
  check(r.eval('displayedProducts.every(p=>p.store==="Amazon")'),language+': automatic exploration Amazon only');
  check(!/etsy\.com/i.test(r.el('#resultGrid').innerHTML),language+': rendered cards have no Etsy URLs');
  check(/tag=3gifts-21/.test(r.el('#resultGrid').innerHTML),language+': affiliate links retained');
  r.c.injectedEtsy=paused;r.eval('activeCatalogProducts.push(...injectedEtsy.map(normalizeProduct))');
  r.set('refineReason','owned').dispatchEvent({type:'change'});r.set('refineDirection','differentCategory');r.set('refineSurprise','balanced');
  r.el('#refinementForm').dispatchEvent({type:'submit'});
  check(r.eval('displayedProducts.every(p=>p.store==="Amazon")')&&!/etsy\.com/i.test(r.el('#resultGrid').innerHTML),language+': refinements cannot reintroduce Etsy');
  await r.a.showResults(true,true,true);
  check(r.eval('displayedProducts.every(p=>p.store==="Amazon")'),language+': all explicit recovery flags remain Amazon-only');
 }
 console.log(JSON.stringify({assertions,languages:2,policy:'Amazon only',errors:0,browserQA:false}));
})().catch(e=>{console.error(e);process.exitCode=1});
