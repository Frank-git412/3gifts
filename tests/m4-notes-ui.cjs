const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
(async()=>{
 const {publicPlan,publicCandidate}=await import('../server/research/public-adapter.mjs');
 const {selectResearchIdeas}=await import('../server/research/research-engine.mjs');
 for(const lang of ['it','en']){
  const r=createRuntime(lang);r.seed();r.set('interest',['culture','styleBeauty']);r.eval('syncInterestFlow()');r.set('subinterest',['books','skincare']);r.set('minBudget','15');r.set('budgetChoice','60');
  r.set('note',lang==='it'?'Ama i libri, niente horror. Nome privato Mario Rossi.':'Likes books, no horror. Private name Mario Rossi.');
  const requests=[];
  r.c.fetch=async(url,options)=>{
   const body=JSON.parse(options.body);requests.push(body);assert.ok(!JSON.stringify(body).includes('Mario Rossi'));assert.ok(!('note' in body.profile));
   const ctx=publicPlan(body),candidates=[...ctx.plan.queries,...ctx.plan.fallbackQueries].map((q,i)=>{
    const asin='B'+String(requests.length*100+i).padStart(9,'0');
    return publicCandidate({asin,title:q.keywords,features:q.searchKeywords||q.keywords,price:30,url:'https://www.amazon.it/dp/'+asin,researchQueryIds:[q.id]},ctx);
   }).filter(Boolean);
   const selected=selectResearchIdeas(candidates,ctx.plan);assert.ok(selected.products.length,JSON.stringify(body));
   return {ok:true,json:async()=>({method:'research-20261007',products:selected.products,searched:ctx.plan.queries.length})};
  };
  await r.a.showResults();assert.equal(requests.length,1);assert.deepEqual(requests[0].constraints.requiredSignals,[]);assert.ok(requests[0].constraints.exclusions.includes('horror'));
  for(const detail of [lang==='it'?'Solo libri':'Only books',lang==='it'?'Ama un romanzo sulla natura':'Likes a novel about nature']){
   r.set('refineReason','owned');r.set('refineDirection','funny');r.set('refineSurprise','balanced');r.set('refineDetail',detail);
   const form=r.el('#refinementForm');await form.listeners.submit[0]({preventDefault(){},currentTarget:form});
  }
  assert.equal(requests.length,3);for(const request of requests.slice(1)){
   assert.ok(request.constraints.requiredSignals.includes('books'));assert.ok(request.constraints.exclusions.includes('horror'));
   for(const key of ['interests','subinterests','ageRange','budget','minBudget','relation','occasion'])assert.deepEqual(request.profile[key],requests[0].profile[key]);
   assert.ok(request.rejectedAsins.length>0);assert.ok(request.constraints.noteConstraints.some(c=>c.origin==='note'&&c.type==='preference'));
   assert.ok(request.constraints.noteConstraints.some(c=>c.origin==='refinement'&&c.type==='requirement'));
   assert.ok(request.constraints.noteConstraints.every(c=>c.language===lang));
  }
  assert.ok(requests[2].constraints.optionalIntents.includes('m3:K003'));
  console.log('PASS '+lang+' note -> requirement refinement -> optional-property refinement; raw note remains local');
 }
 console.log(JSON.stringify({languages:2,flows:2,refinements:4,actualFrontend:true,realAmazonCalls:0,browserQA:false}));
})().catch(error=>{console.error(error);process.exit(1)});
