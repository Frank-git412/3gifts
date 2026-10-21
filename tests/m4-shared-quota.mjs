import test from 'node:test';
import assert from 'node:assert/strict';
import {amazonLabGateway} from '../server/amazon-lab-gateway.mjs';
import {amazonApi} from '../server/amazon-transport.mjs';
import {database} from './d1-fixture.mjs';
const key='fixed_test_key_not_a_production_credential';
const payload={keywords:'fixture book',maxPrice:6000,minPrice:1500,resources:['itemInfo.title','itemInfo.features']};
const request=(body={payload},token=key)=>new Request('https://3gifts.it/api/amazon/lab',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});
const environment=(binding,id,limit=2)=>({DB:binding,AMAZON_LAB_GATEWAY_KEY:key,AMAZON_DAILY_REQUEST_LIMIT:limit,AMAZON_CREATORS_CLIENT_ID:id,AMAZON_CREATORS_CLIENT_SECRET:'fixture',AMAZON_CREATORS_VERSION:'3.2',AMAZON_PARTNER_TAG:'fixture-21'});
test('Gateway fails closed without configuration or authentication; no catalogue traffic',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('must not fetch');};
 try{assert.equal((await amazonLabGateway(request(),{})).status,503);assert.equal((await amazonLabGateway(request({},'wrong'),{AMAZON_LAB_GATEWAY_KEY:key})).status,401);assert.equal((await amazonLabGateway(request({payload:{...payload,maxPrice:999999}}),{AMAZON_LAB_GATEWAY_KEY:key})).status,400);}
 finally{globalThis.fetch=original;}
});
test('Public transport and laboratory share quota; cached lab observations do not spend again',async()=>{
 const {db,binding}=database(),env=environment(binding,'m4-shared-gateway',1),original=globalThis.fetch;let calls=0;
 const canonical={keywords:payload.keywords,searchIndex:'All',condition:'New',marketplace:'www.amazon.it',partnerTag:'fixture-21',itemCount:10,maxPrice:6000,minPrice:1500,resources:payload.resources};
 globalThis.fetch=async url=>url.includes('/auth/')?Response.json({access_token:'fixture'}):(++calls,Response.json({searchResult:{items:[]}}));
 try{
  await amazonApi('searchItems',canonical,env);
  const cached=await (await amazonLabGateway(request(),env)).json();assert.equal(cached.cacheHit,true);assert.equal(calls,1);
  const exhausted=await amazonLabGateway(request({payload:{...payload,keywords:'another query'}}),env);assert.equal(exhausted.status,429);assert.equal((await exhausted.json()).code,'daily_quota_exhausted');assert.equal(calls,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM amazon_requests').get().n,1);
 }finally{globalThis.fetch=original;db.close();}
});
test('Gateway constrains marketplace, partner, resource list and deadline',async()=>{
 const {db,binding}=database(),env=environment(binding,'m4-gateway-validation'),original=globalThis.fetch;let sent;
 globalThis.fetch=async(url,opts)=>url.includes('/auth/')?Response.json({access_token:'fixture'}):(sent=JSON.parse(opts.body),Response.json({searchResult:{items:[]}}));
 try{
  const r=await amazonLabGateway(request({payload:{...payload,partnerTag:'untrusted',marketplace:'evil',resources:['private','itemInfo.title']}}),env);assert.equal(r.status,200);assert.equal(sent.marketplace,'www.amazon.it');assert.equal(sent.partnerTag,'fixture-21');assert.deepEqual(sent.resources,['itemInfo.title']);
  assert.equal((await amazonLabGateway(request({payload,deadline:Date.now()-1}),env)).status,504);
 }finally{globalThis.fetch=original;db.close();}
});
test('Both built Workers use one counter; laboratory stops when the shared budget is exhausted',async()=>{
 const {default:site}=await import('../dist/server/index.js?shared-quota');
 const {default:lab}=await import('../../3gifts-lab/dist/server/index.js?shared-quota');
 const {db,binding}=database(),env=environment(binding,'m4-two-workers',1),original=globalThis.fetch;let catalogCalls=0,gatewayCalls=0;
 globalThis.fetch=async(url,options)=>{
  if(url==='https://3gifts.it/api/amazon/lab'){gatewayCalls++;return site.fetch(new Request(url,options),env);}
  if(url.includes('/auth/'))return Response.json({access_token:'fixture'});
  assert.ok(url.startsWith('https://creatorsapi.amazon/'));catalogCalls++;return Response.json({searchResult:{items:[]}});
 };
 try{
  const labRequest=new Request('https://lab.test/api/recommend',{method:'POST',headers:{Origin:'https://lab.test'},body:JSON.stringify({answers:{age:'adult',interests:['foodDrink'],subcategories:{foodDrink:['coffeeTea']},effect:'any',min:30,max:100}})});
  const body=await(await lab.fetch(labRequest,{AMAZON_LAB_GATEWAY_KEY:key,AMAZON_PARTNER_TAG:'fixture-21'})).json();
  assert.equal(gatewayCalls,2);assert.equal(catalogCalls,1);assert.ok(body.diagnostics.failureReasons.includes('daily_quota_exhausted'));assert.equal(body.diagnostics.amazonCalls,1);assert.equal(body.partial,true);
  const publicRequest=new Request('https://3gifts.it/api/amazon/recommend',{method:'POST',headers:{Origin:'https://3gifts.it','Content-Type':'application/json'},body:JSON.stringify({profile:{ageRange:'adult',interests:['culture'],subinterests:['books'],budget:60,minBudget:15}})});
  const publicBody=await(await site.fetch(publicRequest,env)).json();assert.ok(publicBody.diagnostics.failureReasons.includes('daily_quota_exhausted'));assert.equal(catalogCalls,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM amazon_requests').get().n,1);
  assert.ok(!JSON.stringify(body).includes(key));assert.ok(!JSON.stringify(publicBody).includes(key));
 }finally{globalThis.fetch=original;db.close();}
});
