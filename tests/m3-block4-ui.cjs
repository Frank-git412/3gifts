const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
(async()=>{
 const {publicPlan,publicCandidate}=await import('../server/research/public-adapter.mjs');
 const {selectResearchIdeas}=await import('../server/research/research-engine.mjs');
 let scenarios=0;
 for(const language of ['it','en'])for(const [note,family,title,evidence] of [
  ['Senza profumo','creme_mani','Crema mani','Senza profumo'],
  ['Fragrance-free','creme_mani','Hand cream','Fragrance-free'],
  ['Senza risciacquo','acque_micellari','Acqua micellare','Senza risciacquo'],
  ['No-rinse','acque_micellari','Micellar water','No-rinse'],
  ['Non grassa','creme_mani','Crema mani','Non grassa'],
  ['Non-greasy','creme_mani','Hand cream','Non-greasy']
 ]){
  const r=createRuntime(language);r.seed();r.set('interest',['styleBeauty']);r.set('subinterest',['skincare']);r.set('note',note);r.set('budgetChoice','60');r.set('minBudget','10');
  const requests=[];
  r.c.fetch=async(url,options)=>{
   const data=JSON.parse(options.body);requests.push(data);const ctx=publicPlan(data);
   assert.equal(ctx.blocked,false);assert.ok(!('note' in data.profile));
   const q=ctx.plan.candidateQueries.find(q=>q.family===family);assert.ok(q);
   ctx.plan.queries=[q];ctx.plan.fallbackQueries=[];
   const products=[evidence,''].map((features,i)=>({asin:'B'+String(requests.length*10+i).padStart(9,'0'),title,features,price:30,url:'https://www.amazon.it/dp/B'+String(requests.length*10+i).padStart(9,'0')+'?tag=3gifts-21',researchQueryIds:[q.id]}));
   const accepted=products.map(p=>publicCandidate(p,ctx)).filter(Boolean);assert.equal(accepted.length,1);
   const selected=selectResearchIdeas(accepted,ctx.plan);assert.equal(selected.products[0].features,evidence);
   return {ok:true,json:async()=>({method:'research-20261007',products:selected.products,effectiveMin:ctx.plan.profile.effectiveMin})};
  };
  await r.a.showResults();assert.equal(requests.length,1);assert.equal((r.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length,1,language+' '+note+' retains feature-only evidence');
  r.set('refineReason','owned');r.set('refineDirection','differentType');r.set('refineSurprise','balanced');
  const form=r.el('#refinementForm');await form.listeners.submit[0]({preventDefault(){},currentTarget:form});
  assert.equal(requests.length,2);assert.deepEqual(requests[1].constraints.exclusions,requests[0].constraints.exclusions);
  scenarios++;
 }
 console.log(JSON.stringify({scenarios,langs:['it','en'],featureOnlyEvidence:true,refinementPreservesRequirements:true,amazonCalls:0}));
})().catch(e=>{console.error(e);process.exit(1)});
