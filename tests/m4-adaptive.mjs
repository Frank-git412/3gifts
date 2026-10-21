import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nextResearchQuery,efficientQueries,publicPlan,sufficientIdeas,QUERY_STRATEGY_VERSION} from '../server/research/public-adapter.mjs';
import {database} from './d1-fixture.mjs';
const q=(id,area,subId='one',family=id,extra={})=>({id,area,subId,family,associations:[{area,subId,family}],...extra});
const plan={interests:['a','b'],subcategories:{a:['one'],b:['two']}};
const selected={products:[{asin:'A',areas:['a'],tags:['one']}],missing:['b']};
test('Search the uncovered interest before another alternative for a covered interest',()=>{
 const pending=[q('a2','a'),q('b2','b','two')],copy=structuredClone(pending);
 const d=nextResearchQuery(pending,plan,selected);assert.equal(d.query.id,'b2');assert.equal(d.reason,'missing_interest');assert.deepEqual(pending,copy);
});
test('Query associations can cover a missing interest even when its primary area differs',()=>{
 const d=nextResearchQuery([q('a','a'),q('bridge','a','one','bridge',{associations:[{area:'b',subId:'two'}]})],plan,selected);assert.equal(d.query.id,'bridge');
});
test('Requested subcategory stays ahead of extra alternatives after interests are covered',()=>{
 const p={interests:['a'],subcategories:{a:['one','two']}};
 const d=nextResearchQuery([q('a','a'),q('b','a','two')],p,selected);assert.equal(d.query.id,'b');assert.equal(d.reason,'missing_subcategory');
});
test('Four requested subcategories do not create impossible three-card coverage',()=>{
 const p={interests:['a'],subcategories:{a:['one','two','three','four']}};
 assert.equal(nextResearchQuery([q('a','a'),q('b','a','two')],p,selected).query.id,'a');
});
test('A stalled generic family is deferred but neither deleted nor blocked',()=>{
 const p={interests:['a'],subcategories:{a:['one']}},a=q('again','a','one','same'),b=q('different','a');
 const d=nextResearchQuery([a,b],p,selected,[{query:q('prior','a','one','same'),gained:false}]);assert.equal(d.query.id,'different');
 assert.equal(nextResearchQuery([a],p,selected,[{query:a,gained:false}]).query.id,'again');
});
for(const protectedField of [{contextual:true},{optionalTermId:'m3:K003'},{lexicalTermIds:['m3:K003']},{requiredListingProperties:['fragranceFree']}])test('Targeted query retains its order despite an earlier failed family '+JSON.stringify(protectedField),()=>{
 const p={interests:['a'],subcategories:{a:['one']}},a=q('target','a','one','same',protectedField);
 assert.equal(nextResearchQuery([a,q('next','a')],p,selected,[{query:a,gained:false}]).query.id,'target');
});
test('When nothing succeeds all planned queries remain reachable exactly once',()=>{
 const p={interests:['a','b'],queries:[q('a1','a'),q('a2','a'),q('b1','b'),q('b2','b')],fallbackQueries:[],subcategories:{}};
 const pending=efficientQueries(p),seen=[],observations=[];
 while(pending.length){const d=nextResearchQuery(pending,p,{products:[]},observations);pending.splice(d.index,1);seen.push(d.query.id);observations.push({query:d.query,gained:false});}
 assert.deepEqual([...seen].sort(),['a1','a2','b1','b2']);assert.equal(nextResearchQuery([],p,{products:[]}),null);
});
test('A later successful observation resets the family deferral',()=>{
 const a=q('again','a','one','same'),p={interests:['a'],subcategories:{}};
 assert.equal(nextResearchQuery([a,q('b','a')],p,selected,[{query:a,gained:false},{query:a,gained:true}]).query.id,'again');
});
test('An empty occasion-specific search cannot demote its broader base query',()=>{
 const a=q('base','a','one','same'),p={interests:['a'],subcategories:{}};
 assert.equal(nextResearchQuery([a,q('other','a')],p,selected,[{query:{...a,contextual:true},gained:false}]).query.id,'base');
});
test('M3 complete manifest stays bounded and retains the exact candidate query set',()=>{
 const scenarios=JSON.parse(fs.readFileSync('docs/m3-manifest-120-frozen.json')).scenarios;
 for(const {request} of scenarios){const ctx=publicPlan(request),pending=efficientQueries(ctx.plan),ids=pending.map(q=>q.id).sort(),actual=[];assert.ok(pending.length<=12);while(pending.length){const d=nextResearchQuery(pending,ctx.plan,{products:[]});actual.push(pending.splice(d.index,1)[0].id);}assert.deepEqual(actual.sort(),ids);}
});

// Compiled-Worker integration: fixed catalogue, failed searches for one area,
// same eligibility/ranking and transport as production. A fake clock avoids waits.
test('Compiled Worker reaches a missing interest with fewer catalogue calls and reuses its cache',async()=>{
 const worker=(await import('../dist/server/index.js?adaptive-integration')).default;
 const source=fs.readFileSync('dist/server/index.js','utf8');
 const needle='nextResearchQuery(pending,ctx.plan,selected,observations,{diversify})';assert.ok(source.includes(needle));
 const fixedSource=source.replace(needle,"({index:0,reason:'fixed_order',missingAreas:[],missingSubcategories:[]})");
 const fixed=(await import('data:text/javascript;base64,'+Buffer.from(fixedSource).toString('base64'))).default;
 const {db,binding}=database(),originalFetch=globalThis.fetch,originalNow=Date.now;let clock=originalNow(),calls=0;
 const profile={ageRange:'adult',interests:['culture','styleBeauty'],subinterests:['books','skincare'],minBudget:15,budget:60,occasion:'birthday'};
 const ctx=publicPlan({profile}),ordered=efficientQueries(ctx.plan),perArea=Object.fromEntries(ctx.plan.interests.map(a=>[a,ordered.filter(q=>q.area===a)]));
 const bodyFor=(title,asin)=>({asin,detailPageURL:'https://www.amazon.it/dp/'+asin,itemInfo:{title:{displayValue:title},features:{displayValues:[title]}},offersV2:{listings:[{price:{money:{amount:30,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}});
 const responses=new Map(ordered.map((q,i)=>[q.searchKeywords||q.keywords,[]]));
 // One eligible book in the first request. A generic cream is only found on
 // the third skincare query; the next category provides a different function.
 for(const [area,queries] of Object.entries(perArea))for(let i=0;i<queries.length;i++){
  const q=queries[i];if(area==='culture'&&i<=1||area==='styleBeauty'&&i>=2)responses.set(q.searchKeywords||q.keywords,[bodyFor(q.keywords,'B'+String(100+i+(area==='culture'?0:20)).padStart(9,'0'))]);
 }
 Date.now=()=>clock;
 globalThis.fetch=async(url,options)=>{if(url.includes('/auth/'))return Response.json({access_token:'fixture',expires_in:3600});calls++;clock+=3000;return Response.json({searchResult:{items:responses.get(JSON.parse(options.body).keywords)||[]}});};
 const env={DB:binding,AMAZON_CREATORS_VERSION:'3.2',AMAZON_CREATORS_CLIENT_ID:'adaptive-integration',AMAZON_CREATORS_CLIENT_SECRET:'fixture',AMAZON_PARTNER_TAG:'fixture-21'};
 const request=()=>new Request('https://3gifts.it/api/amazon/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify({profile})});
 try{
  const baselineDb=database();let baseline;
  try{baseline=await(await fixed.fetch(request(),{...env,DB:baselineDb.binding,AMAZON_CREATORS_CLIENT_ID:'fixed-comparison'})).json();}finally{baselineDb.db.close();}
  const result=await(await worker.fetch(request(),env)).json();assert.equal(result.queryStrategy,QUERY_STRATEGY_VERSION);assert.equal(result.products.length,3);assert.deepEqual(result.missingAreas,[]);assert.ok(result.searches.slice(1,4).every(q=>q.associations.some(a=>a.area==='styleBeauty')));assert.ok(result.searched<baseline.searched,JSON.stringify({adaptive:result.searched,fixed:baseline.searched}));assert.deepEqual(result.products.map(p=>p.asin),baseline.products.map(p=>p.asin));assert.deepEqual(result.products.map(p=>p.ranking),baseline.products.map(p=>p.ranking));
  const before=calls,repeat=await(await worker.fetch(request(),env)).json();assert.equal(calls,before);assert.equal(repeat.efficiency.amazonCalls,0);assert.deepEqual(repeat.products.map(p=>p.asin),result.products.map(p=>p.asin));assert.equal(result.diagnostics.normalization.length,result.received);
  const refinedReq=new Request('https://3gifts.it/api/amazon/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify({profile:{...profile,isRefinement:true},rejectedAsins:result.products.map(p=>p.asin)})});
  const refined=await(await worker.fetch(refinedReq,env)).json();assert.ok(refined.products.every(p=>!result.products.some(x=>x.asin===p.asin)));assert.ok(refined.searched<=12);
  console.log(JSON.stringify({adaptiveFixture:{fixedCalls:baseline.efficiency.amazonCalls,calls:result.efficiency.amazonCalls,searched:result.searched,repeatCalls:repeat.efficiency.amazonCalls,products:result.products.map(p=>p.asin)}}));
 }finally{Date.now=originalNow;globalThis.fetch=originalFetch;db.close();}
});
