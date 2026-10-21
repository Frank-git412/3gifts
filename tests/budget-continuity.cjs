const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createRuntime}=require('./published-runtime.cjs');
(async()=>{
 const {publicPlan,publicCandidate}=await import('../server/research/public-adapter.mjs');
 for(const lang of ['it','en']){
  const r=createRuntime(lang);r.seed();r.set('interest',['techGaming']);r.set('subinterest',['tech']);r.set('budgetChoice','500');r.set('minBudget','0');
  const calls=[];
  r.c.fetch=async(url,opt)=>{const data=JSON.parse(opt.body),ctx=publicPlan(data);calls.push(ctx.plan.profile.effectiveMin);const n=calls.length;
   return {ok:true,json:async()=>({method:'research-20261007',products:[1,2,3].map(i=>({asin:'B'+String(n*10+i).padStart(9,'0'),name:'Cuffie Bluetooth',store:'Amazon',type:'product',tags:['techGaming','tech'],price:Math.max(30,ctx.plan.profile.effectiveMin),amazonPrice:true,url:'https://www.amazon.it/dp/B'+String(n*10+i).padStart(9,'0')+'?tag=3gifts-21',conceptFamily:'tech:'+i,researchMethod:true}))})};};
  await r.a.showResults();const f=r.el('#refinementForm');r.set('refineReason','banal');r.set('refineDirection','funny');r.set('refineSurprise','balanced');
  for(let n=0;n<2;n++){r.set('refineReason','banal');r.set('refineDirection','funny');r.set('refineSurprise','balanced');await f.listeners.submit[0]({preventDefault(){},currentTarget:f});}
  r.set('refineReason','price');r.set('refineDirection','practical');r.set('refineSurprise','balanced');r.set('refineBudget','100');await f.listeners.submit[0]({preventDefault(){},currentTarget:f});
  assert.deepEqual(calls,[250,250,250,0],lang+' first, two unchanged refinements, explicit lower maximum');
  const html=fs.readFileSync(lang==='it'?'dist/index.html':'dist/en/index.html','utf8');assert.ok(!/costo totale e consegna verificati|verified total costs and delivery/.test(html));assert.match(html,lang==='it'?/eventuali spese di spedizione/:/any delivery charges/);
 }
 const profile={ageRange:'adult',interests:['techGaming'],subinterests:['tech'],budget:500,minBudget:350,isRefinement:true};assert.equal(publicPlan({profile}).plan.profile.effectiveMin,350);
 assert.throws(()=>publicPlan({profile:{...profile,budget:300}}));
 console.log('IT/EN: initial range, two refinements, explicit budget change, explicit minimum, honest delivery text passed.');
})().catch(e=>{console.error(e);process.exit(1)});
