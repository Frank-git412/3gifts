import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database} from './d1-fixture.mjs';
import {amazonApi} from '../server/amazon-transport.mjs';
import {efficientQueries,sufficientIdeas} from '../server/research/public-adapter.mjs';

const credentials={AMAZON_CREATORS_VERSION:'3.2',AMAZON_CREATORS_CLIENT_ID:'fixture',AMAZON_CREATORS_CLIENT_SECRET:'fixture',AMAZON_PARTNER_TAG:'3gifts-21'};
const payload={keywords:'lampada lettura',marketplace:'www.amazon.it',partnerTag:'3gifts-21',maxPrice:6000};

test('Shared cache coalesces independent workers, preserves age of observations, isolates budgets and expires',async()=>{
 const {db,binding}=database(),env={...credentials,DB:binding},original=globalThis.fetch,starts=[];
 const a=(await import('../dist/server/index.js?eff-a')).default;
 const b=(await import('../dist/server/index.js?eff-b')).default;
 globalThis.fetch=async(url)=>{
  if(url.includes('/auth/'))return Response.json({access_token:'fixture',expires_in:3600});
  starts.push(Date.now());return Response.json({itemsResult:{items:[{asin:'B0DMT42CFL'}]}});
 };
 try{
  const req=()=>new Request('https://3gifts.it/api/amazon/status');
  const responses=await Promise.all([a.fetch(req(),env),b.fetch(req(),env)]);
  for(const r of responses)assert.equal((await r.json()).ok,true);
  assert.equal(starts.length,1,'two worker instances must reuse the same catalogue result');
  globalThis.fetch=async(url)=>{
   if(url.includes('/auth/'))return Response.json({access_token:'fixture',expires_in:3600});
   starts.push(Date.now());return Response.json({searchResult:{items:[]}});
  };
  const one=await amazonApi('searchItems',payload,env),two=await amazonApi('searchItems',payload,env);
  assert.equal(two.cacheHit,true);assert.equal(two.observedAt,one.observedAt);assert.equal(starts.length,2);
  await amazonApi('searchItems',{...payload,maxPrice:5000},env);assert.equal(starts.length,3);
  for(let i=1;i<starts.length;i++)assert.ok(starts[i]-starts[i-1]>=1090,'shared calls must be paced');
  db.prepare('UPDATE amazon_cache SET expires=0').run();
  // A separate transport instance has no local cache and must reject expired rows.
  const fresh=await import('../server/amazon-transport.mjs?fresh');
  await fresh.amazonApi('searchItems',payload,env);assert.equal(starts.length,4);
  assert.equal(db.prepare('SELECT count(*) n FROM amazon_cache WHERE expires=0').get().n,0);
 }finally{globalThis.fetch=original;db.close();}
});

test('A 429 pauses all workers and honours Retry-After without extra Amazon requests',async()=>{
 const {db,binding}=database(),env={...credentials,DB:binding},original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url)=>{if(url.includes('/auth/'))return Response.json({access_token:'fixture'});calls++;return Response.json({retryAfterSeconds:30},{status:429});};
 try{
  await assert.rejects(amazonApi('searchItems',{...payload,keywords:'throttle-one'},env),/429/);
  const other=await import('../server/amazon-transport.mjs?throttle-other');
  await assert.rejects(other.amazonApi('searchItems',{...payload,keywords:'throttle-two'},env),/429/);
  assert.equal(calls,1);assert.ok(db.prepare('SELECT blocked_until FROM amazon_gate').get().blocked_until>Date.now()+29000);
 }finally{globalThis.fetch=original;db.close();}
});

test('Storage failure does not bypass the shared limiter',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('must not call Amazon');};
 try{await assert.rejects(amazonApi('searchItems',{...payload,keywords:'db-failure'},{...credentials,DB:{prepare(){throw Error('DB unavailable');}}}),/DB unavailable/);assert.equal(calls,0);}finally{globalThis.fetch=original;}
});

test('Amazon SearchResult 404 is an empty search, while unrelated 404 remains an error',async()=>{
 const {db,binding}=database(),env={...credentials,DB:binding},original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url)=>{if(url.includes('/auth/'))return Response.json({access_token:'fixture'});calls++;return Response.json({__type:'com.amazon.creators#ResourceNotFoundException',resourceType:'SearchResult'},{status:404});};
 try{
  const metrics={},empty=await amazonApi('searchItems',{...payload,keywords:'no-results-fixture'},env,Date.now()+10000,metrics);
  assert.deepEqual(empty.data.searchResult.items,[]);assert.equal(empty.partial,false);assert.equal(metrics.emptySearches,1);
  await amazonApi('searchItems',{...payload,keywords:'no-results-fixture'},env);assert.equal(calls,1);
  globalThis.fetch=async()=>Response.json({resourceType:'Other'},{status:404});
  await assert.rejects(amazonApi('searchItems',{...payload,keywords:'real-error-fixture'},env),/upstream_404/);
 }finally{globalThis.fetch=original;db.close();}
});

test('Three valid ideas stop before six calls; repeat uses zero calls; refinement excludes prior ASINs',async()=>{
 const {db,binding}=database(),env={...credentials,DB:binding},original=globalThis.fetch;
 const worker=(await import('../dist/server/index.js?eff-early')).default;let calls=0;
 globalThis.fetch=async(url,opts)=>{
  if(url.includes('/auth/'))return Response.json({access_token:'fixture',expires_in:3600});
  const body=JSON.parse(opts.body),asin='B'+String(++calls).padStart(9,'0');
  return Response.json({searchResult:{items:[{asin,detailPageURL:'https://www.amazon.it/dp/'+asin,itemInfo:{title:{displayValue:body.keywords},features:{displayValues:[body.keywords]}},offersV2:{listings:[{price:{money:{amount:35,currency:'EUR'}},availability:{type:'IN_STOCK'}}]}}]}});
 };
 const profile={ageRange:'adult',interests:['techGaming'],subinterests:['tech'],budget:60,minBudget:15};
 const req=data=>new Request('https://3gifts.it/api/amazon/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify(data)});
 try{
  const first=await (await worker.fetch(req({profile}),env)).json();
  assert.equal(first.products.length,3);assert.ok(first.searched<6,JSON.stringify(first.efficiency));assert.equal(first.partial,false);assert.equal(first.efficiency.stopReason,'sufficient');
  const count=calls,repeat=await (await worker.fetch(req({profile}),env)).json();
  assert.equal(calls,count);assert.equal(repeat.efficiency.amazonCalls,0);assert.deepEqual(repeat.products.map(p=>p.asin),first.products.map(p=>p.asin));
  const rejectedAsins=first.products.map(p=>p.asin);
  const refined=await (await worker.fetch(req({profile:{...profile,isRefinement:true},rejectedAsins}),env)).json();
  assert.ok(refined.products.length>0);assert.ok(refined.products.every(p=>!rejectedAsins.includes(p.asin)&&p.price>=15&&p.price<=60));
  console.log(JSON.stringify({efficiencyFixture:{firstCalls:count,repeatCalls:repeat.efficiency.amazonCalls,refinementCalls:refined.efficiency.amazonCalls}}));
 }finally{globalThis.fetch=original;db.close();}
});

test('Early completion requires all interests and requested subcategories; query associations are preserved',()=>{
 const plan={interests:['a','b'],subcategories:{a:['one'],b:['two']},queries:[{area:'a',keywords:'first'},{area:'a',keywords:'second'},{area:'b',keywords:'third'}],fallbackQueries:[{area:'a',keywords:'first'}]};
 assert.deepEqual(efficientQueries(plan).map(q=>q.keywords),['first','third','second','first']);
 const products=[{areas:['a'],tags:['one']},{areas:['a'],tags:['one']},{areas:['a'],tags:['one']}];
 assert.equal(sufficientIdeas({products,missing:['b']},plan),false);
 products[2]={areas:['b'],tags:['wrong']};assert.equal(sufficientIdeas({products,missing:[]},plan),false);
 products[2].tags=['two'];assert.equal(sufficientIdeas({products,missing:[]},plan),true);
});
