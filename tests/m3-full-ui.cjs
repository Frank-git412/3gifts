const assert=require('node:assert/strict');
const {createRuntime}=require('./published-runtime.cjs');
(async()=>{
 const {researchTaxonomy}=await import('../server/research/research-engine.mjs');
 const {publicPlan}=await import('../server/research/public-adapter.mjs');
 const {EXPANDED_TERMS}=await import('../server/research/expanded-data.mjs');
 const {PILOT_BILINGUAL_LEXICON}=await import('../server/research/pilot-lexicon-data.mjs');
 const terms=[...EXPANDED_TERMS,...PILOT_BILINGUAL_LEXICON];
 const {database}=await import('./d1-fixture.mjs');
 const worker=(await import('../dist/server/index.js?full='+Date.now())).default;
 const original={fetch:globalThis.fetch,now:Date.now,timer:globalThis.setTimeout};let clock=Date.now(),calls=0,scenarios=0,refinements=0;
 // Simulate transport pacing only; not a live quota/concurrency or browser test.
 Date.now=()=>clock;globalThis.setTimeout=(fn,ms,...args)=>ms<2000?(clock+=ms,queueMicrotask(()=>fn(...args)),0):original.timer(fn,ms,...args);
 try{for(const lang of ['it','en'])for(const cat of researchTaxonomy().categories){
  const {db,binding}=database();
  try{
   const r=createRuntime(lang);r.seed();const age=cat.audience==='general'?'adult':cat.audience,stage=cat.id==='earlySensory'?'toddler':'preschool';
   r.set('ageRange',age);r.eval('syncAgeFlow()');r.set('childStage',stage);r.eval('syncAgeFlow()');r.set('interest',[cat.id]);r.eval('syncInterestFlow()');r.set('subinterest',[]);r.set('budgetChoice','100');r.set('minBudget','10');r.set('note','');r.set('tone','useful');
   const ctx=publicPlan({profile:{ageRange:age,childStage:stage,interests:[cat.id],subinterests:[],budget:100,minBudget:10,tone:'useful'}});
   const qs=ctx.plan.candidateQueries;assert.ok(qs.length,cat.id);
   const fixtures=qs.flatMap(q=>{const t=terms.find(t=>t.id===q.area+':'+q.subId+':'+q.keywordId)||terms.find(t=>t.it===q.originalKeyword&&t.id.startsWith(cat.id+':'));return t?[{q,t}]:[];}).slice(0,10);
   assert.ok(fixtures.length,cat.id);const responses=[],requests=[];
   globalThis.fetch=async(url)=>{
    if(url.endsWith('/auth/o2/token'))return Response.json({access_token:'fixture',expires_in:3600});calls++;
    return Response.json({searchResult:{items:fixtures.map(({t},i)=>{
     const asin='B'+String(scenarios*100+i+1).padStart(9,'0');
     return {asin,detailPageURL:'https://www.amazon.it/dp/'+asin,itemInfo:{title:{displayValue:lang==='it'?t.it:t.en},features:{displayValues:[age==='earlyChild'?(stage==='toddler'?'12–36 mesi':'3–6 anni'):age==='child'?'7–12 anni':'Per adulti']},classifications:{productGroup:{displayValue:/Books|books|comics/.test(cat.id)?'Books':''}}},offersV2:{listings:[{price:{money:{amount:30,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}};
    })}});
   };
   r.c.fetch=async(url,options)=>{
    const request=JSON.parse(options.body);requests.push(request);assert.ok(!('note' in request.profile));
    const response=await worker.fetch(new Request('https://3gifts.it/api/amazon/recommend',{...options,signal:undefined,headers:{Origin:'https://3gifts.it','Content-Type':'application/json'}}),{DB:binding,AMAZON_CREATORS_VERSION:'3.2',AMAZON_CREATORS_CLIENT_ID:'full-'+lang+'-'+cat.id,AMAZON_CREATORS_CLIENT_SECRET:'fixture',AMAZON_PARTNER_TAG:'3gifts-21'});
    const body=await response.json();responses.push(body);return {ok:response.ok,json:async()=>body};
   };
   await r.a.showResults();assert.equal(requests.length,1,cat.id+' '+lang);
   const first=responses[0];assert.ok(first.products?.length>0,JSON.stringify({category:cat.id,lang,request:requests[0],response:first}));
   assert.equal((r.el('#resultGrid').innerHTML.match(/class="gift-card"/g)||[]).length,first.products.length,cat.id+' rendered cards');
   assert.ok(first.searched<=12);assert.equal(first.methodRevision,(await import('../server/research/weighted-ranking.mjs')).RANKING_VERSION);
   r.set('refineReason','owned');r.set('refineDirection','differentType');r.set('refineSurprise','balanced');
   const form=r.el('#refinementForm');await form.listeners.submit[0]({preventDefault(){},currentTarget:form});
   assert.equal(requests.length,2);assert.ok(responses[1].products.every(p=>!first.products.some(old=>p.asin===old.asin)));assert.ok(responses[1].searched<=12);refinements++;
   scenarios++;console.log('PASS '+lang+' '+cat.id);
  }finally{db.close();}
 }}finally{globalThis.fetch=original.fetch;Date.now=original.now;globalThis.setTimeout=original.timer;}
 console.log(JSON.stringify({scenarios,refinements,simulatedAmazonCalls:calls,realAmazonCalls:0,transportClock:'simulated',actualWorkerAndFrontend:true}));
})().catch(e=>{console.error(e);process.exit(1)});
