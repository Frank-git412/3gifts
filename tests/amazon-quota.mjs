import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './d1-fixture.mjs';
import {reserveAmazonRequest,amazonApi} from '../server/amazon-transport.mjs';
test('Independent workers compete atomically for the last rolling-window slot',async()=>{
 const {db,binding}=database(),env={DB:binding,AMAZON_DAILY_REQUEST_LIMIT:'3'},now=Date.now();
 try{
  await reserveAmazonRequest(env,{},now-100);await reserveAmazonRequest(env,{},now-100);
  const other=await import('../server/amazon-transport.mjs?quota-second');
  const outcomes=await Promise.allSettled([reserveAmazonRequest(env,{},now),other.reserveAmazonRequest(env,{},now)]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  assert.match(outcomes.find(r=>r.status==='rejected').reason.message,/daily_quota_exhausted/);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM amazon_requests').get().n,3);
  await assert.rejects(reserveAmazonRequest(env,{},now+86399899),/daily_quota_exhausted/);
  await reserveAmazonRequest(env,{},now+86399900);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM amazon_requests').get().n,2);
  assert.match(JSON.stringify(db.prepare('EXPLAIN QUERY PLAN SELECT COUNT(*) FROM amazon_requests WHERE created_at>?').all(now)),/amazon_requests_created_at/);
 }finally{db.close();}
});
test('No DB, invalid limit and request ceiling fail closed',async()=>{
 const {db,binding}=database();
 try{
  await assert.rejects(amazonApi('searchItems',{},{}),/quota_storage_unavailable/);
  for(const limit of [0,8641,'bad'])await assert.rejects(reserveAmazonRequest({DB:binding,AMAZON_DAILY_REQUEST_LIMIT:limit}),/quota_configuration_invalid/);
  await assert.rejects(reserveAmazonRequest({DB:binding},{amazonCalls:12}),/request_quota_exhausted/);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM amazon_requests').get().n,0);
 }finally{db.close();}
});
test('Upstream failures consume budget; cache hits consume none; exhausted quota sends no new call',async()=>{
 const {db,binding}=database(),env={DB:binding,AMAZON_DAILY_REQUEST_LIMIT:2,AMAZON_CREATORS_CLIENT_ID:'quota-fixture',AMAZON_CREATORS_CLIENT_SECRET:'fixture',AMAZON_CREATORS_VERSION:'3.2',AMAZON_PARTNER_TAG:'fixture-21'},original=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>url.includes('/auth/')?Response.json({access_token:'fixture'}):(++calls===1?Response.json({error:true},{status:400}):Response.json({searchResult:{items:[]}}));
 try{
  await assert.rejects(amazonApi('searchItems',{keywords:'failure'},env),/upstream_400/);
  await amazonApi('searchItems',{keywords:'success'},env);
  assert.equal((await amazonApi('searchItems',{keywords:'success'},env)).cacheHit,true);
  await assert.rejects(amazonApi('searchItems',{keywords:'third'},env),/daily_quota_exhausted/);
  assert.equal(calls,2);assert.equal(db.prepare('SELECT COUNT(*) n FROM amazon_requests').get().n,2);
 }finally{globalThis.fetch=original;db.close();}
});
