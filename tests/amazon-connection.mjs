import {database} from './d1-fixture.mjs';
const {db,binding}=database();
import assert from 'node:assert/strict';
const {amazonConnection}=await import('../server/amazon-creators.mjs');
let calls=0;
globalThis.fetch=async(url,opts)=>{calls++;const body=JSON.parse(opts.body);if(calls===1){assert.equal(url,'https://api.amazon.co.uk/auth/o2/token');assert.equal(body.client_secret,'private-test-secret');return Response.json({access_token:'private-test-token'});}assert.equal(opts.headers.Authorization,'Bearer private-test-token');assert.equal(body.partnerTag,'3gifts-21');return Response.json({itemsResult:{items:[{asin:'B0DMT42CFL'}]}});};
const env={DB:binding,AMAZON_CREATORS_VERSION:'v3.2',AMAZON_CREATORS_CLIENT_ID:'test-client',AMAZON_CREATORS_CLIENT_SECRET:'private-test-secret',AMAZON_PARTNER_TAG:'3gifts-21'};
const results=await Promise.all(Array.from({length:3},()=>amazonConnection(new Request('https://3gifts.it/api/amazon/status'),env)));
assert.equal(calls,2);
for(const r of results){const text=await r.text();assert.equal(JSON.parse(text).ok,true);assert.ok(!text.includes('private-test'));}
assert.equal((await amazonConnection(new Request('https://3gifts.it/api/amazon/status',{method:'POST'}),env)).status,405);
console.log('Amazon connection: authentication, catalog, caching and secret redaction passed.');

db.close();
